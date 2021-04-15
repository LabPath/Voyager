// Require: Libs
const helper = require('../lib/helper')
const embeds = require('../lib/embeds')

// Require: Files
const config = require('../config.json')

// Exports
module.exports = {
    name: 'h',
    aliases: ['help'],
    help: {
        isVisible: true,
        name: 'help',
        title: 'Display available commands.',
        detailedInfo: 'Show message explaining how to issue commands with all available commands.',
        usage: 'help'
    },
    permissions: [],
    devOnly: false,
    trusted: false,
    needsDatabaseGuild: true,
    channelTypes: ['dm', 'text', 'news'],
    execute(message, args, dbGuild) {
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // If trusted == true and user has permissions
        if (this.trusted && !dbGuild.data.trusted.includes(message.author.id) && !dbGuild.data.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send(config.texts.wrongChannel)
        // Check if arguments are correct
        if (!checkCommandArguments(args, message, dbGuild))
            return message.channel.send(config.texts.wrongCommandUsage)

        // If user asked for help on a specific command
        if (args[0]) {
            // Variables
            let description = ``
            let command = null
            let embed = null

            // Set command
            for (i of message.client.commands.values()) {
                if (i.name == args[0] || i.aliases.includes(args[0])) {
                    command = i
                    break
                }
            }

            // Set description
            if (command.aliases.length != 0) description += `**Aliases:** \`${command.aliases}\`\n`
            description += `**Detailed info:** ${command.help.detailedInfo}\n`
            description += `**Usage:** \`@Voyager ${command.help.usage}\`\n`
            if (command.help.example) description += `**Example:** \`@Voyager ${command.help.example}\`\n`

            // Create embed
            embed = embeds.simpleFooter(config.colors.blue, `Command \`${command.name}\``, description)

            // Add legend
            embed.addField(`Legend:`, config.texts.helpMessageLegend)

            // Send embed
            message.channel.send(embed)
        }
        // General help command
        else {
            // Variables
            let embed = embeds.simpleFooter(config.colors.blue, `Command list`, config.texts.helpMessage)

            // Iterate commands
            message.client.commands.each((cmd) => {
                // If trusted or developer, show every help command
                if (dbGuild.data.developers.includes(message.author.id) || dbGuild.data.trusted.includes(message.author.id)) {
                    embed.addField(`\`${cmd.help.name}\``, cmd.help.title, true)
                }
                // Show only isVisible = true commands
                else if (cmd.help.isVisible) embed.addField(`\`${cmd.help.name}\``, cmd.help.title, true)
            })

            // Send embed
            message.channel.send(embed)
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args, message, dbGuild) {
    // Check for args[0]
    if (args[0]) {
        // Iterate commands
        for (i of message.client.commands.values()) {
            // If trusted or developer, show every help command
            if (dbGuild.data.developers.includes(message.author.id) || dbGuild.data.trusted.includes(message.author.id)) {
                if (i.name == args[0] || i.aliases.includes(args[0])) return true
            }
            // Show only isVisible = true commands
            else if (i.help.isVisible && (i.name == args[0] || i.aliases.includes(args[0]))) return true
        }
        return false
    }
    return true
}
