const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')

// Exports
module.exports = {
    name: 'clear',
    aliases: ['del', 'delete', 'purge'],
    permissions: [],
    userPermissions: ['MANAGE_MESSAGES'],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm', 'text', 'news'],
    execute(message, args, dbGuild) {
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send(config.texts.wrongChannel)
        // Check if user has permissions
        if (!helper.checkUserPermissions(message.channel.guild.members.cache.get(message.author.id), this.userPermissions))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if arguments are correct
        if (!checkCommandArguments(args))
            return message.channel.send(config.texts.wrongCommandUsage)

        // Delete args[0] amount of messages
        deleteMessages(message.channel, args[0])
    }
}

// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args[0]
    if (!args[0]) return false
    else if (Number.isInteger(parseInt(args[0])) || args[0] == 'all') return true
    else return false
}

// Delete messages
async function deleteMessages(channel, n) {
    // Clone channel and delete old channel
    if (n == 'all') {
        // Clone channel
        const newChannel = await channel.clone()
        console.log(newChannel.id)

        // Delete old channel
        channel.delete() // TODO: before deleting maybe check if channel.id equals any dbGuild.channels.id 
    }
    // Delete n amount of messages (+ 1 because of command from user)
    else {
        channel.bulkDelete(parseInt(n) + 1)
            .then(messages => { channel.send(`Nothing to see here. Including \`${messages.size - 1}\` message(s). :eyes:`).then(msg => msg.delete({ timeout: config.timings.msgDelete })) })
            .catch(console.error)
    }
}
