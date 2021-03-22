// Require: Libs
const embeds = require('../lib/embeds')
const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')
const controllerCodes = require('../database/Code/controller')
const controllerUsers = require('../database/User/controller')

// Exports
module.exports = {
    name: 'code',
    aliases: [],
    permissions: [],
    devOnly: false,
    trusted: true,
    needsDatabaseGuild: true,
    channelTypes: ['text', 'news'],
    async execute(message, args, dbGuild) {
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

        // A ideia e user code <code> <date> <emoji><amount> <emoji> <amount> <emoji2> <amount2>
        // Trusted users podem tambem usar isto para criar codigos novos
        // Codigos novos sao gravados na base de dados
        // Sempre que e usado este command, o bot cria a informacao no #redemption-codes
        // Sempre que e usado este command, o bot manda DM a quem disse que queria receber DM a dizer "Run `@Voyager <code>` for free goodies! Expires on <date>."

        // Check if code exists in DB
        let code = await controllerCodes.getOne({ code: args[0] })
        if ('err' in code) {
            echo.error(`Getting Code. Code ${code.code}.`)
            echo.error(code.err)
            return message.channel.send(config.texts.generalError)
        }
        // Code does not exist, create new one
        else if (code.code == 404) {
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
                    sendNotification(message, code)
                }
            }
        }
        // Code exists
        else if (code.code == 200) {
            // User only sent code
            if (!args[1]) {
                // Ask to publish
                if (code.data.published == false) {
                    if (await askToPublish(message, code)) {
                        // Publish
                        code = await publishCode(message, code, dbGuild)

                        // Send notification to users
                        sendNotification(message, code)
                    }
                } else message.channel.send(config.texts.code.alreadyPublished)
            }
            // User sent code and info as well
            else {
                // Variables
                const description = `${code.data.code}\n${helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards)}`

                // Send embed
                message.channel.send(config.texts.code.alreadyExists)
                await showCode(message, description, code, args, dbGuild)
            }
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args[0]
    if (!args[0]) return false
    // Check for args[1]
    else if (args[1]) {
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
async function showCode(message, description, code, args, dbGuild) { // TODO: make this a helper function. As well as all functions that rely on waiting for input.
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
                if (collected.first()._emoji.name == '🔄') updateCode(message, code, args)
                // Delete
                else if (collected.first()._emoji.name == '❌') deleteCode(message, code)
                // Publish
                else if (collected.first()._emoji.name == '🇵') {
                    if (code.data.published == false) {
                        // Publish
                        code = await publishCode(message, code, dbGuild)

                        // Send notification to users
                        sendNotification(message, code)
                    }
                    else message.channel.send(config.texts.code.alreadyPublished)
                }
                // Quit
                else if (collected.first()._emoji.name == '🇶') message.channel.send('Got it, quitting.')
            })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)
            })
    })
}

// Update redemption code
async function updateCode(message, code, args) {
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

        // Send embed
        message.channel.send(embeds.simple(config.colors.success, config.texts.code.successUpdating, description))
    }
}

// Delete redemption code
async function deleteCode(message, code) {
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
        message.channel.send(`Successfully deleted code \`${code.data.code}\``)
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
                if (collected.first()._emoji.name == '👍') return true
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
                const channel = message.client.channels.cache.get(dbGuild.data.channels.codes)

                // Send code and publish if possible
                const msgCode = await channel.send(code.data.code)
                if (channel.type === 'news') msgCode.crosspost().catch((err) => { console.log(err) })

                // Send info and publish if possible
                const msgInfo = await channel.send(helper.generateRedemptionCodesInfo(code.data.expiration_date, code.data.rewards))
                if (channel.type === 'news') msgInfo.crosspost().catch((err) => { console.log(err) })

                // Tag role
                channel.send(helper.getRoleAsMentionFromId(dbGuild.data.roles[i]['redemption_codes'].id))

                // Update DB published = true
                code = await controllerCodes.put(code.data._id, { published: true })

                // Break and return
                return code
            }
        }
    } else return message.channel.send(config.texts.noCodesChannelSet)
}

// Send a DM notification to every user with notify = true
async function sendNotification(message, code) {
    // Variables
    const users = await controllerUsers.get()

    // Iterate over all user
    for (let i = 0; i < users.data.length; i++) {
        // Send redeem message
        message.client.users.fetch(users.data[i].discord_id, false).then((user) => {
            user.send(`A new code has arrived! Copy paste the following message so I can redeem it for you:\n\`\`\`\n@Voyager - DEV#5810 redeem ${code.data.code}\`\`\``)
        })
    }
}
