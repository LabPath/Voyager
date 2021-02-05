// Require: Libs
const helper = require('../lib/helper')
const echo = require('../lib/echo')
const embeds = require('../lib/embeds')

// Require: Files
const config = require('../config.json')
const controllerGuild = require('../database/Guild/controller')

// Exports
module.exports = {
    name: 'set',
    aliases: [],
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
                // Set channel
                if (args[2]) dbGuild = await setChannel(dbGuild, args[1], args[2])
                else dbGuild = await setChannel(dbGuild, args[1], message.channel.id)

                // Check if error in dbGuild
                if ('err' in dbGuild) {
                    echo.error(`Updating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                } else {
                    if (args[2]) {
                        message.channel
                            .send(`Set ${helper.getChannelAsMentionFromId(args[2])} as a \`${args[1]}\` channel.`)
                            .then(msg => {
                                msg.delete({ timeout: config.timings.msgDelete })
                                message.delete({ timeout: config.timings.msgDelete })
                            })
                    } else {
                        message.channel
                            .send(`Set ${helper.getChannelAsMentionFromId(message.channel.id)} as a \`${args[1]}\` channel.`)
                            .then(msg => {
                                msg.delete({ timeout: config.timings.msgDelete })
                                message.delete({ timeout: config.timings.msgDelete })
                            })
                    }

                    // Send Roles embed if args[1] == roles
                    if (args[1] == 'roles') {
                        // Delete old embed if exists
                        if (dbGuild.data.message_reaction_id) {
                            const msg = await message.client.channels.cache
                                .get(dbGuild.data.channels.roles).messages.fetch(dbGuild.data.message_reaction_id)
                                .catch(async err => { if (err.message.includes('Unknown')) return dbGuild = await controllerGuild.put(dbGuild.data._id, { message_reaction_id: null }) })
                            msg.delete() // TODO: This shouldn't run if a catch is caught
                        }

                        // Create new
                        message.channel.send(embeds.listRoles(config.colors.blue, 'Role assignment:', dbGuild.data.roles))
                            .then(async msg => {
                                // React with emojis
                                for (i of dbGuild.data.roles)
                                    for (j in i)
                                        msg.react(helper.getEmojiAsMentionFromId(i[j].emoji))

                                // Save msg.id to database
                                dbGuild = await controllerGuild.put(dbGuild.data._id, { message_reaction_id: msg.id })
                            })
                    }
                }
                break
            case 'role':
                // Variables
                let emoji = null
                let type = null

                // Check for type
                for (i of Object.keys(config.commands.set.roles)) if (Object.values(config.commands.set.roles[i]).includes(args[1])) {
                    type = i
                    break
                }

                // Create emoji if url
                if (args[3].includes('http')) {
                    emoji = await helper.createEmoji(message.guild, args[3], type)
                    emoji = { id: `${emoji.name}:${emoji.id}` }
                }
                else emoji = { id: helper.getIdFromMention(args[3]) }
                // console.log(args[3])
                // console.log(emoji)

                // Check emoji
                if (emoji.id == undefined) return message.channel.send(config.texts.generalError) // TODO: Normal emojis (:smile:) do not work, as the unicode instead of text is sent.

                // Set role
                dbGuild = await setRole(dbGuild, type, args[2], emoji.id)
                // Check if error in dbGuild
                if ('err' in dbGuild) {
                    echo.error(`Updating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                } else {
                    message.channel
                        .send(`Set ${args[2]} ${helper.getEmojiAsMentionFromId(emoji.id)} as \`${type}\` role.`)
                        .then(msg => {
                            msg.delete({ timeout: config.timings.msgDelete })
                            message.delete({ timeout: config.timings.msgDelete })
                        })
                    // TODO: If it's a new role, update reaction embed with new role
                }
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
            // Check for args[1] and args[2]
            if (!args[1] || !args[2] || !args[3]) return false
            else {
                // Check for args[1]
                for (i of Object.keys(config.commands.set.roles)) {
                    if (Object.values(config.commands.set.roles[i]).includes(args[1])) return true
                }
                // TODO: Check uf args[2] is valid role
                // TODO: Check if args[3] is valid URL or emoji ID
            }
            return false
        default:
            return false
    }
}

// Saves channel ID in database as channel
async function setChannel(dbGuild, type, channelId) {
    // Variables
    let body = { channels: dbGuild.data.channels }

    // Set channel ID
    body.channels[type] = channelId

    // Return
    return await controllerGuild.put(dbGuild.data._id, body)
}

// Saves role ID in database as role
async function setRole(dbGuild, type, roleId, emojiId) {
    // Visual Guides: https://www.flaticon.com/free-icon/book_2947998?term=book&page=1&position=86&page=1&position=86&related_id=2947998&origin=search
    // Lab: https://www.flaticon.com/free-icon/hexagon_117772?term=hexagon&page=1&position=26&page=1&position=26&related_id=117772&origin=search
    // Dismal: https://www.flaticon.com/free-icon/hexagon_117772?term=hexagon&page=1&position=26&page=1&position=26&related_id=117772&origin=search
    // Codes: https://www.flaticon.com/free-icon/coupon_2089363?term=coupon&page=1&position=3&page=1&position=3&related_id=2089363&origin=search
    // Map guides: https://www.flaticon.com/free-icon/place_711170?term=map&page=1&position=73&page=1&position=73&related_id=711170&origin=search

    // Variables
    let body = { roles: [] }
    let role = {}

    // Recreate roles array with missing Role
    for (i of dbGuild.data.roles) {
        if ((!i[type]) || (i[type] && i[type].id != helper.getIdFromMention(roleId))) {
            body.roles.push(i)
        }
    }

    // Set roles[type] with role role ID
    role[type] = { id: helper.getIdFromMention(roleId), emoji: emojiId }
    body.roles.push(role)

    // Return
    return await controllerGuild.put(dbGuild.data._id, body)
}
