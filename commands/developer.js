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
        const missingPerms = helper.checkBotPermissions(message, this.permissions)
        if (missingPerms.length != 0)
            return message.channel.send(helper.generatePermissionLink(missingPerms, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.data.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send(config.texts.wrongChannel)

        // Add Developers to Guild
        await controllerGuild.put(dbGuild.data._id, { $addToSet: { developers: { $each: helper.getUserFromMention(args) } } }) // TODO: Generate pretty embed
    }
}
