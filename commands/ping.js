// Require: Libs
const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')

// Exports
module.exports = {
    name: 'ping',
    aliases: [],
    help: {
        isVisible: false,
        name: 'ping',
        title: 'Ping me and get an answer.',
        detailedInfo: 'Ping me and I\'ll ping you back.',
        usage: 'ping'
    },
    permissions: [],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm', 'text', 'news'],
    async execute(message, args) {
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

        // Send embed
        message.channel.send(`Pong.`)
    }
}
