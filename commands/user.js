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
    help: {
        isVisible: true,
        name: 'user',
        title: 'Change your user settings.',
        detailedInfo: 'Change your user settings. You can either update or delete your info. Voyager only stores your Discord ID and your in-game UID.',
        usage: 'user'
    },
    permissions: [],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm'],
    activeUsers: [],
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

        // Add user to active users of command until command has finished
        this.activeUsers.push(message.author.id)

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
        // Update user
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
        else {
            await message.channel.send(embeds.simpleFooter(config.colors.success, config.texts.user.successCreatingNew, description))
            message.channel.send(`If you ever want to update/delete your user information, run \`@Voyager user\` again!`).then((msg) => { msg.pin() })
        }
    }

    // Remove user from active users of command
    helper.removeArrayEntry(message.client.commands.get('user').activeUsers, message.author.id)
}

// Show user an embed with info and ask to update or delete
async function showUser(message, user) {
    // Variables
    let description = `\`\`\`json\nUID: ${user.data.afk.afk_uids}\nNotify: ${user.data.afk.notify}\`\`\`\nDo you want to update or delete it?`
    const filter = (reaction, user) => {
        if (user.id === message.author.id && ['🔄', '❌', '🇶'].includes(reaction.emoji.name)) return true
        return false
    }

    // Send embed
    message.channel.send(embeds.simple(config.colors.success, config.texts.user.successFound, description)).then((msg) => {
        msg.react('🔄')
        msg.react('❌')
        msg.react('🇶')
        msg.awaitReactions(filter, { max: 1, time: 10000, errors: ['time'] })
            .then(async collected => {
                // Update
                if (collected.first()._emoji.name == '🔄') createUser(message, user)
                // Delete
                else if (collected.first()._emoji.name == '❌') await deleteUser(message, user)
                // Quit
                else if (collected.first()._emoji.name == '🇶') message.channel.send('Got it, quitting.')
            })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)

                // Remove user from active users of command
                helper.removeArrayEntry(message.client.commands.get('user').activeUsers, message.author.id)
            })
    })
}

// Create new user
async function deleteUser(message, user) {
    // Ask user if they're sure
    const answer = await helper.askYesOrNo(message, 'Are you sure you want to delete your info?', 20000)

    // If true
    if (answer == true) {
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
    // If false
    else if (answer == false) message.channel.send('That makes me happy! I did not delete your info.')
    // If out of time
    else if (answer == 'out_of_time') {
        message.channel.send(config.texts.outOfTime)
        return false
    }

    // Remove user from active users of command
    helper.removeArrayEntry(message.client.commands.get('user').activeUsers, message.author.id)
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
                // Remove user from active users of command
                helper.removeArrayEntry(message.client.commands.get('user').activeUsers, message.author.id)

                message.channel.send(config.texts.outOfTime)
                return false
            })
    })
}

// Ask if user wants bot to send a message to user whenever a new code is available
async function askNotify(message, body) {
    // Ask user if they're sure
    const answer = await helper.askYesOrNo(message, config.commands.user.questions[1], 20000)

    // If true
    if (answer == true) {
        // Save to body
        body.afk.notify = true
        return body
    }
    // If false
    else if (answer == false) return body
    // If out of time
    else if (answer == 'out_of_time') {
        // Remove user from active users of command
        helper.removeArrayEntry(message.client.commands.get('user').activeUsers, message.author.id)

        message.channel.send(config.texts.outOfTime)
        return false
    }
}
