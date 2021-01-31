// Require: Libs
const embeds = require('../lib/embeds')
const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')
const controllerGuild = require('../database/Guild/controller')

// Exports
module.exports = {
    name: 'dev',
    aliases: ['developer'],
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

        // Add Developers to Guild
        dbGuild = await controllerGuild.put(dbGuild.data._id, { $addToSet: { developers: { $each: helper.getIdFromMention(args) } } }) // TODO: Generate pretty embed
        if ('err' in dbGuild) {
            echo.error(`Updating Guild. Code ${dbGuild.code}.`)
            echo.error(dbGuild.err)
            return message.channel.send('There was an error, sorry.') // TODO: Make a better error message for discord users
        }
    }
}
