// Require: Libs
const helper = require('../lib/helper')
const embeds = require('../lib/embeds')

// Require: Files
const config = require('../config.json')
const controllerUser = require('../database/User/controller')

// Exports
module.exports = {
    name: 'u',
    aliases: ['user'],
    permissions: [],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm'],
    execute(message, args, dbGuild) {
        // TODO: if this is 
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send('I can only run this command in DMs.')

        // Variables
        let body = {
            discord_id: message.author.id,
            afk: {
                afk_uids: null,
                redeem_automatically: false
            }
        }

        // Ask for in-game UID
        askUID(message, body)
    }
}

/* --- Functions --- */
// Ask for in-game UID
function askUID(message, body) {
    // Filter
    const filter = response => {
        if (!response.author.bot) {
            if (response.content.match(/^\d+$/g)) return true
            else {
                message.channel.send('Invalid UID. Please try again.')
                return false
            }
        }
    }

    // Ask user
    message.channel.send(config.commands.user.questions[0].question).then(() => {
        message.channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] })
            .then(collected => {
                body.afk.afk_uids = collected.first().content
                askAutomaticRedeems(message, body)
            })
            .catch(collected => {
                message.channel.send(config.texts.outOfTime)
            })
    })
}

// Ask if user wants to have the bot automatically attempt to redeem new redemption codes
function askAutomaticRedeems(message, body) {
    // Filter
    const filter = (reaction, user) => {
        if (user.id === message.author.id && (reaction.emoji.name === '👍' || reaction.emoji.name === '👎')) return true
        return false
    }

    // Ask
    message.channel.send(config.commands.user.questions[1].question).then((message) => {
        message.react('👍')
        message.react('👎')
        message.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
            .then(async collected => {
                if (collected.first()._emoji.name == '👍') body.afk.redeem_automatically = true

                // Variables
                let description = `\`\`\`\nUID: ${body.afk.afk_uids}\nAuto-redeem: ${body.afk.redeem_automatically}\`\`\``

                // Create new user
                const user = await controllerUser.post(body)
                if ('err' in user) {
                    echo.error(`Creating User. Code ${user.code}.`)
                    echo.error(user.err)
                    return message.channel.send(config.texts.generalError)
                } else message.channel.send(embeds.simpleFooter(config.colors.success, config.texts.user.successCreatingNew, description))
            })
            .catch(collected => {
                message.channel.send(config.texts.outOfTime)
            })
    })
}
