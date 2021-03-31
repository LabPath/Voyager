// Require: Libs
const embeds = require('../lib/embeds')
const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')
const controllerCodes = require('../database/Code/controller')
const controllerUsers = require('../database/User/controller')
const controllerGuild = require('../database/Guild/controller')

// Exports
module.exports = {
    name: 'code',
    aliases: [],
    permissions: [],
    devOnly: false,
    trusted: true,
    needsDatabaseGuild: true,
    allowedInServers: ['669974531959554057', '419580897189167116'],
    channelTypes: ['text', 'news'],
    async execute(message, args, dbGuild) {
        // Check for server permissions
        if (!this.allowedInServers.includes(message.guild.id))
            return message.channel.send(config.texts.wrongServer)
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.data.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // If trusted == true and user has permissions
        if (this.trusted && !dbGuild.data.trusted.includes(message.author.id) && !dbGuild.data.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send(config.texts.wrongChannel)
        // Check if arguments are correct
        args = helper.cleanArgs(args)
        if (!checkCommandArguments(args))
            return message.channel.send(config.texts.wrongCommandUsage)

        // Check if code exists in DB
        let code = await controllerCodes.getOne({ code: args[0] })
        if ('err' in code) {
            echo.error(`Getting Code. Code ${code.code}.`)
            echo.error(code.err)
            return message.channel.send(config.texts.generalError)
        }
        // Code does not exist, create new one
        else if (code.code == 404) {
            // Check for args
            if (args[1]) {
                // Check for args[>1]
                if (!args[2] || !args[3]) return message.channel.send(config.texts.code.codeDoesNotExistYet)
                // Check for Emoji
                else if (!helper.getIdFromMention(args[2])) return message.channel.send(config.texts.code.codeDoesNotExistYet)
            } else return message.channel.send(config.texts.code.codeDoesNotExistYet)

            // Create new code
            code = await controllerCodes.post(generateCode(args))
            if ('err' in code) {
                echo.error(`Creating Code. Code ${code.code}.`)
                echo.error(code.err)
                return message.channel.send(config.texts.generalError)
            }
            // Success
            else {
                // Variables
                const description = `${code.data.code}\n${helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards)}`

                // Send embed
                message.channel.send(embeds.simple(config.colors.success, config.texts.code.successCreatingNew, description))

                // Ask to publish
                if (await askToPublish(message, code)) {
                    // Publish
                    code = await publishCode(message, code, dbGuild)

                    // Send notification to users
                    if (code) sendNotification(message, code)
                }
            }
        }
        // Code exists
        else if (code.code == 200) {
            // Variables
            const description = `${code.data.code}\n${helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards)}`

            // Send embed
            message.channel.send(config.texts.code.alreadyExists)
            await showCode(message, description, code, args, dbGuild)
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args, forced) {
    // Check for args[0]
    if (!args[0]) return false
    // Check for args[1]
    else if (args[1] || forced) {
        // Check for args[>1]
        if (!args[2] || !args[3]) return false
        // Check for Emoji
        else if (!helper.getIdFromMention(args[2])) return false
        else return true
    }
    else return true
}

/* --- Functions --- */
// Create new Code
function generateCode(args) {
    // Variables
    let body = {
        code: args[0],
        expiration_date: args[1],
        rewards: []
    }

    // Iterate args
    for (let i = 2; i < args.length; i += 2) {
        // Push to rewards array
        body.rewards.push({
            emoji: helper.getIdFromMention(args[i]),
            amount: args[i + 1].toUpperCase()
        })
    }

    // Return
    return body
}

// Show embed with info and ask to update or delete or quit
async function showCode(message, description, code, args, dbGuild) { // TODO: Make this a helper function. As well as all functions that rely on waiting for input.
    // Variables
    const filter = (reaction, user) => {
        if (user.id === message.author.id && (reaction.emoji.name === '🔄' || reaction.emoji.name === '❌' || reaction.emoji.name === '🇶' || reaction.emoji.name === '🇵')) return true
        return false
    }

    // Send embed
    message.channel.send(embeds.simple(config.colors.success, config.texts.code.successFound, description)).then((msg) => {
        msg.react('🔄')
        msg.react('🇵')
        msg.react('❌')
        msg.react('🇶')
        msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
            .then(async collected => {
                // Update
                if (collected.first()._emoji.name == '🔄') updateCode(message, code, args, dbGuild)
                // Delete
                else if (collected.first()._emoji.name == '❌') deleteCode(message, code, dbGuild)
                // Publish
                else if (collected.first()._emoji.name == '🇵') {
                    if (code.data.published == false) {
                        // Publish
                        code = await publishCode(message, code, dbGuild)

                        // Send notification to users
                        if (code) sendNotification(message, code)
                    } else message.channel.send(config.texts.code.alreadyPublished)
                }
                // Quit
                else if (collected.first()._emoji.name == '🇶') message.channel.send('Got it, quitting.')
            })
            .catch(collected => msg.channel.send(config.texts.outOfTime))
    })
}

// Update redemption code
async function updateCode(message, code, args, dbGuild) {
    // Check args
    if (!checkCommandArguments(args, true))
        return message.channel.send(`In order to update a code, please use \`redeem <code> <expiration_date> i(<emoji> <reward>)\``)

    // Update info
    code = await controllerCodes.put(code.data._id, generateCode(args))
    if ('err' in code) {
        echo.error(`Updating Code. Code ${code.code}.`)
        echo.error(code.err)
        return message.channel.send(config.texts.generalError)
    }
    // Success
    else {
        // Variables
        const description = `${code.data.code}\n${helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards)}`

        // Update message in redemption-codes channel
        const channel = await message.client.channels.cache.get(dbGuild.data.channels.codes)
        /* channel.messages.fetch(dbGuild.data.codes[code.data.code].codeMsgId)
            .then(msg => msg.edit(code.data.code))
            .catch(console.error) */
        channel.messages.fetch(dbGuild.data.codes[code.data.code].rewardsMsgId)
            .then(msg => msg.edit(helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards)))
            .catch(console.error)

        // Send embed
        message.channel.send(embeds.simple(config.colors.success, config.texts.code.successUpdating, description))
    }
}

// Delete redemption code
async function deleteCode(message, code, dbGuild) {
    // Variables
    let codes = dbGuild.data.codes

    // Delete messages from reemption codes channel
    const channel = await message.client.channels.cache.get(dbGuild.data.channels.codes)
    channel.messages.fetch(dbGuild.data.codes[code.data.code].codeMsgId)
        .then(msg => msg.delete())
        .catch(console.error)
    channel.messages.fetch(dbGuild.data.codes[code.data.code].rewardsMsgId)
        .then(msg => msg.delete())
        .catch(console.error)
    channel.messages.fetch(dbGuild.data.codes[code.data.code].rolePingMsgId)
        .then(msg => msg.delete())
        .catch(console.error)

    // Delete code from dbGuild.codes
    delete codes[code.data.code]
    controllerGuild.put(dbGuild.data._id, { codes: codes })

    // Update info
    code = await controllerCodes.delete({ _id: code.data._id })
    if ('err' in code) {
        echo.error(`Deleting Code. Code ${code.code}.`)
        echo.error(code.err)
        return message.channel.send(config.texts.generalError)
    }
    // Success
    else {
        // Send embed
        message.channel.send(`Successfully deleted code \`${code.data.code}\`.`)
    }
}

// Ask user if code is ready to be published
async function askToPublish(message, code) {
    // Filter
    const filter = (reaction, user) => {
        if (user.id === message.author.id && (reaction.emoji.name === '👍' || reaction.emoji.name === '👎')) return true
        return false
    }

    // Ask
    return await message.channel.send(config.commands.code.questions[1]).then((msg) => {
        msg.react('👍')
        msg.react('👎')
        return msg.awaitReactions(filter, { max: 1, time: 40000, errors: ['time'] })
            .then(async collected => {
                // Save to body
                if (collected.first()._emoji.name == '👍') {
                    message.channel.send(`Publishing!`)
                    return true
                }
                else {
                    message.channel.send(`Got it, not publishing. Run \`code ${code.data.code}\` so I can ask you again!`)
                    return false
                }
            })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)
                return false
            })
    })
}

// Publish code to channel and send users a notification
async function publishCode(message, code, dbGuild) {
    // console.log(dbGuild.data.roles)
    // Check if codes channel is set
    if (dbGuild.data.channels && dbGuild.data.channels.codes) {
        // Get codes role ID
        for (let i = 0; i < dbGuild.data.roles.length; i++) {
            if (dbGuild.data.roles[i]['redemption_codes']) {
                // Variables
                let codes = {}
                const channel = message.client.channels.cache.get(dbGuild.data.channels.codes)
                if (!channel) return message.channel.send(config.texts.noCodesChannelSet)

                // Send code and publish if possible
                const msgCode = await channel.send(code.data.code)
                if (channel.type === 'news') msgCode.crosspost().catch((err) => { console.log(err) })

                // Send info and publish if possible
                const msgInfo = await channel.send(helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards))
                if (channel.type === 'news') msgInfo.crosspost().catch((err) => { console.log(err) })

                // Tag role
                const msgRolePing = await channel.send(helper.getRoleAsMentionFromId(dbGuild.data.roles[i]['redemption_codes'].id))

                // Update DB published = true
                code = await controllerCodes.put(code.data._id, { published: true })

                // Save message IDs to dbGuild
                if (dbGuild.data.codes) codes = dbGuild.data.codes
                codes[code.data.code] = {
                    codeMsgId: msgCode.id,
                    rewardsMsgId: msgInfo.id,
                    rolePingMsgId: msgRolePing
                }
                dbGuild = await controllerGuild.put(dbGuild.data._id, { codes: codes })

                // Break and return
                return controllerGuild.put(dbGuild.data._id, {})
            }
        }

        // Role redemption_codes is not set up
        message.channel.send(config.texts.noCodesRoleSet)
        return false
    } else {
        message.channel.send(config.texts.noCodesChannelSet)
        return false
    }
}

// Send a DM notification to every user with notify = true
async function sendNotification(message, code) {
    // Variables
    const users = await controllerUsers.get()

    // Iterate over all user
    for (let i = 0; i < users.data.length; i++) {
        message.client.users.fetch(users.data[i].discord_id, false)
            .then((user) => {
                // Send DM with redeem info
                if (users.data[i].afk.notify) {
                    // Variables
                    let message = `New code \`${code.data.code}\` available!\n`
                    message += `${helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards)}\n`
                    message += `Should I redeem \`${code.data.code}\` for you? Let me know by mentioning me and writing the following:`

                    // Send messages
                    user.send(message)
                    user.send(`\`\`\`\nredeem ${code.data.code}\`\`\``)
                    // TODO: Create a FAQ about the bot and have there: user.send(`If you do not wish to get notified, feel free to edit/delete your user info with \`${process.env.VOYAGER_PREFIX} user\`.`)
                }
            })
            .catch((err) => {
                // Error
                if (err.message == 'Unknown User') {
                    // Delete user from DB
                    controllerUsers.delete({ _id: users.data[i]._id })
                }
                else console.log(err) // TODO: Send to logs channel
            })
    }
}
