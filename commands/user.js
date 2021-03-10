// Require: Libs
const helper = require('../lib/helper')
const embeds = require('../lib/embeds')

// Require: Files
const config = require('../config.json')
const controllerUser = require('../database/User/controller')

// Exports
module.exports = {
    name: 'user',
    aliases: [],
    permissions: [],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm'],
    async execute(message, args, dbGuild) {
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes)) {
            message.delete()
            message.client.users.fetch(message.author.id, false).then((user) => {
                user.send('Please run `@Voyager user` here, instead of a server.')
            })
            return
        }

        // Check if user already exists in DB
        let user = await controllerUser.getOne({ discord_id: message.author.id })
        if ('err' in user) {
            echo.error(`Getting User. Code ${user.code}.`)
            echo.error(user.err)
            return message.channel.send(config.texts.generalError)
        }
        // User does not exist, create new one
        else if (user.code == 404) {
            // Create new user
            createUser(message)
        }
        // User exists
        else if (user.code == 200) {
            // Ask if update or delete
            showUser(message, user)
        }
    }
}

/* --- Functions --- */
// Create new user
async function createUser(message, user) {
    // Variables
    let body = {
        discord_id: message.author.id,
        afk: {
            afk_uids: null,
            notify: false
        }
    }

    // Questions
    body = await askUID(message, body) // Ask for in-game UID
    if (!body) return
    body = await askNotify(message, body) // Ask for notify

    // Variables
    let description = `\`\`\`json\nUID: ${body.afk.afk_uids}\nNotify: ${body.afk.notify}\`\`\``

    // Check if update or create
    if (user) {
        // Create new user
        user = await controllerUser.put(user.data._id, body)
        if ('err' in user) {
            echo.error(`Creating User. Code ${user.code}.`)
            echo.error(user.err)
            return message.channel.send(config.texts.generalError)
        }
        // Send embed
        else message.channel.send(embeds.simpleFooter(config.colors.success, config.texts.user.successUpdating, description))
    } else {
        // Create new user
        const user = await controllerUser.post(body)
        if ('err' in user) {
            echo.error(`Creating User. Code ${user.code}.`)
            echo.error(user.err)
            return message.channel.send(config.texts.generalError)
        }
        // Send embed
        else message.channel.send(embeds.simpleFooter(config.colors.success, config.texts.user.successCreatingNew, description))
    }
}

// Show user an embed with info and ask to update or delete
async function showUser(message, user) {
    // Variables
    let description = `\`\`\`json\nUID: ${user.data.afk.afk_uids}\nNotify: ${user.data.afk.notify}\`\`\`\nDo you want to update or delete it?`
    const filter = (reaction, user) => {
        if (user.id === message.author.id && (reaction.emoji.name === '🔄' || reaction.emoji.name === '❌')) return true
        return false
    }

    // Send embed
    message.channel.send(embeds.simple(config.colors.success, config.texts.user.successFound, description)).then((msg) => {
        msg.react('🔄')
        msg.react('❌')
        msg.awaitReactions(filter, { max: 1, time: 10000, errors: ['time'] })
            .then(async collected => {
                // Update
                if (collected.first()._emoji.name == '🔄') createUser(message, user)
                // Delete
                else if (collected.first()._emoji.name == '❌') deleteUser(message, user)
            })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)
            })
    })
}

// Create new user
function deleteUser(message, user) {
    // Filter
    const filter = response => {
        if (!response.author.bot) {
            if (['yes', 'y', 'no', 'n'].includes(response.content.trim().toLowerCase())) return true
            else {
                message.channel.send('Invalid entry, either `yes` or `no`. Please try again.')
                return false
            }
        }
    }

    // Ask if user is sure
    message.channel.send('Are you sure you want to delete your info? (y/n)').then(() => {
        message.channel.awaitMessages(filter, { max: 1, time: 20000, errors: ['time'] })
            .then(async collected => {
                // Check answer
                if (['yes', 'y'].includes(collected.first().content.trim().toLowerCase())) {
                    // Delete user info
                    user = await controllerUser.delete(user.data._id)
                    if ('err' in user) {
                        echo.error(`Deleting User. Code ${user.code}.`)
                        echo.error(user.err)
                        return message.channel.send(config.texts.generalError)
                    }
                    // Send message
                    else message.channel.send(config.texts.user.successDelete)
                }
                else message.channel.send('That makes me happy! I did not delete your info.')
            })
            .catch(collected => {
                message.channel.send(config.texts.outOfTime)
                return false
            })
    })
}

// Ask for in-game UID
async function askUID(message, body) {
    // Filter
    const filter = response => {
        if (!response.author.bot) {
            // Iterate over UIDs
            for (i of response.content.trim().split(/ +/)) {
                // If they don't match return false
                if (!i.match(/^\d+$/g)) {
                    message.channel.send('Invalid UID. Please try again.')
                    return false
                }
            }
            return true
        }
    }

    // Ask user
    return await message.channel.send(config.commands.user.questions[0]).then(() => {
        return message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                // Save to body
                body.afk.afk_uids = collected.first().content.trim().split(/ +/)
                body.afk.afk_uids = body.afk.afk_uids.map(Number)

                // Return
                return body
            })
            .catch(collected => {
                message.channel.send(config.texts.outOfTime)
                return false
            })
    })
}

// Ask if user wants to have the bot automatically attempt to redeem new redemption codes
async function askNotify(message, body) {
    // Filter
    const filter = (reaction, user) => {
        if (user.id === message.author.id && (reaction.emoji.name === '👍' || reaction.emoji.name === '👎')) return true
        return false
    }

    // Ask
    return await message.channel.send(config.commands.user.questions[1]).then((msg) => {
        msg.react('👍')
        msg.react('👎')
        return msg.awaitReactions(filter, { max: 1, time: 20000, errors: ['time'] })
            .then(async collected => {
                // Save to body
                if (collected.first()._emoji.name == '👍') body.afk.notify = true

                // Return
                return body
            })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)
                return false
            })
    })
}
