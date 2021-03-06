// Require: Libs
const helper = require('../lib/helper')
const echo = require('../lib/echo')
const embeds = require('../lib/embeds')

// Require: Files
const config = require('../config.json')
const controllerGuild = require('../database/Guild/controller')

// Exports
module.exports = {
    name: 'rem',
    aliases: ['remove'],
    help: {
        isVisible: false,
        name: 'remove',
        title: 'Remove various things.',
        detailedInfo: 'Remove various details for the server, like for example channels, roles, trusted and developer users.',
        usage: 'rem channel|role|trusted|developer',
        example: 'rem channel roles'
    },
    permissions: ['MANAGE_ROLES', 'MANAGE_EMOJIS'],
    devOnly: true,
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
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send(config.texts.wrongChannel)
        // Check if arguments are correct
        if (!checkCommandArguments(args))
            return message.channel.send(config.texts.wrongCommandUsage)

        // Switch statement for type of set
        switch (args[0]) {
            case 'channel':
                // Variables
                const channelId = dbGuild.data.channels[args[1]]

                // Remove channel
                dbGuild = await removeChannel(message, dbGuild, args[1])

                // Check if error in dbGuild
                if ('err' in dbGuild) {
                    echo.error(`Updating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                } else {
                    // Let channel know
                    message.channel
                        .send(`Removed ${helper.getChannelAsMentionFromId(channelId)} as a \`${args[1]}\` channel.`)
                        .then(msg => {
                            msg.delete({ timeout: config.timings.msgDelete })
                            message.delete({ timeout: config.timings.msgDelete })
                        })
                }
                break
            case 'role':
                // Variables
                let type = null
                let emojiId = null

                // Check for type
                for (i of Object.keys(config.commands.set.roles)) if (Object.values(config.commands.set.roles[i]).includes(args[1])) {
                    type = i
                    break
                }

                // Get Emoji ID
                for (i of dbGuild.data.roles) if (i[type]) {
                    emojiId = helper.getEmojiId(i[type].emoji)
                    break
                }
                // console.log(dbGuild.data.roles)
                // const roleId = dbGuild.data.roles[type].id

                // Set role
                dbGuild = await removeRole(dbGuild, type)
                // Check if error in dbGuild
                if ('err' in dbGuild) {
                    echo.error(`Updating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                } else {
                    message.channel
                        .send(`Removed ${args[1]} as \`${type}\` role.`)
                        .then(async msg => {
                            // Delete messages
                            msg.delete({ timeout: config.timings.msgDelete })
                            message.delete({ timeout: config.timings.msgDelete })

                            // If a role embed already exists
                            if (dbGuild.data.message_reaction_id) {
                                // Get role embed
                                const msgEmbed = await message.client.channels.cache.get(dbGuild.data.channels.roles).messages.fetch(dbGuild.data.message_reaction_id)
                                
                                // Edit message
                                msgEmbed.edit(embeds.listRoles(config.colors.blue, 'Role assignment:', dbGuild.data.roles))
                                .then(async msg => {
                                    // React with emojis
                                    for (i of dbGuild.data.roles)
                                    for (j in i)
                                    msg.react(helper.getEmojiAsMentionFromId(i[j].emoji))
                                })
                                
                                // Remove reactions
                                msgEmbed.reactions.cache.get(emojiId)
                                    .remove()
                                    .catch(err => console.error('Failed to remove reactions: ', err))
                            }
                        })
                }
                break
            case 'trusted':
                // Remove Trusted User
                dbGuild = await controllerGuild.put(dbGuild.data._id, { $pull: { trusted: helper.getIdFromMention(args[1]) } })
                if ('err' in dbGuild) {
                    echo.error(`Adding trusted user. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    message.channel.send(config.texts.generalError)
                } else message.channel.send(`${args[1]} is not part of the Team anymore! Got it.`)
                break
            case 'developer':
                // Remove Developer to Guild
                dbGuild = await controllerGuild.put(dbGuild.data._id, { $pull: { developers: helper.getIdFromMention(args[1]) } })
                if ('err' in dbGuild) {
                    echo.error(`Adding developer. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    message.channel.send(config.texts.generalError)
                } else message.channel.send(`${args[1]} is not my master anymore! Got it.`)
                break
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args[0]
    if (!args[0]) return false
    switch (args[0]) {
        case 'channel':
            // Check for args[1]
            if (!args[1] || !config.commands.set.channels.includes(args[1])) return false
            else return true
        case 'role':
            // Check for args[1]
            for (i of Object.keys(config.commands.set.roles)) {
                if (Object.values(config.commands.set.roles[i]).includes(args[1])) return true
            }
            return false
        case 'trusted':
        case 'developer':
            // Check for args[1]
            if (!args[1] || !helper.getIdFromMention(args[1])) return false
            else return true
        default:
            return false
    }
}

// Remove channel ID in database as channel
async function removeChannel(message, dbGuild, type) {
    // Variables
    let body = { channels: dbGuild.data.channels }

    // Remove Role embed
    if (type == 'roles') {
        const msg = await message.client.channels.cache
            .get(dbGuild.data.channels.roles).messages
            .fetch(dbGuild.data.message_reaction_id)
            .catch(err => { console.log(err) }) // TODO: Catch doesn't work... Delete role message and run rem channel roles
        if (msg) msg.delete()
        else message.channel.send('Could not find Reaction Embed Message. Did not delete it.')

        // Remove message_reaction_id
        body.message_reaction_id = null
    }

    // Remove channel
    body.channels[type] = null

    // Return
    return await controllerGuild.put(dbGuild.data._id, body)
}

// Remove role ID in database as role
async function removeRole(dbGuild, type) {
    // Variables
    let body = { roles: [] }

    // Recreate roles array without Role
    for (i of dbGuild.data.roles) if (!i[type]) body.roles.push(i)

    // Return
    return await controllerGuild.put(dbGuild.data._id, body)
}
