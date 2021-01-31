// Require: Libs
const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')
const controllerGuild = require('../database/Guild/controller')

// Exports
module.exports = {
    name: 'set',
    aliases: [],
    permissions: [],
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
            return message.channel.send('Wrong command usage!')

        // Switch statement for type of set
        switch (args[0]) {
            case 'channel':
                if (args[2]) dbGuild = await setChannel(args[1], args[2])
                else dbGuild = await setChannel(args[1], message.channel.id, dbGuild)
                break
            case 'role':
                dbGuild = await setRole(args[1], args[2])
                break
        }

        // Check if error in dbGuild
        if ('err' in dbGuild) {
            echo.error(`Updating Guild. Code ${dbGuild.code}.`)
            echo.error(dbGuild.err)
            return message.channel.send('There was an error, sorry.') // TODO: Make a better error message for discord users
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
            if (!args[1] || !args[2]) return false
            else {
                // Check for args[1]
                for (i of Object.keys(config.commands.set.roles)) {
                    if (Object.values(config.commands.set.roles[i]).includes(args[1])) return true
                }
            }
            return false
        default:
            return false
    }
}

// Saves channel ID in database as channel
async function setChannel(type, channelId, dbGuild) {
    // Variables
    let body = { channels: {} }

    // Set channel ID
    body.channels[type] = channelId

    // Return
    return await controllerGuild.put(dbGuild.data._id, body)
}

// Saves role ID in database as role
async function setRole(type, roleId) {
    // Variables
    let body = { roles: {} }

    // Check for type
    for (i of Object.keys(config.commands.set.roles)) if (Object.values(config.commands.set.roles[i]).includes(type)) {
        type = i
        break
    }

    // Set Role ID
    body.roles[type] = helper.getIdFromMention(roleId)

    // Return
    return await controllerGuild.put(dbGuild.data._id, body)
}
