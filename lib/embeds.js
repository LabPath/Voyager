// Require: Packages
const discord = require('discord.js')
const package = require('../package.json')

// Require: Libs
const helper = require('../lib/helper')

// Simple
exports.simple = function (hex, title, description) {
    return new discord.MessageEmbed()
        .setColor(`#${hex}`)
        .setTitle(title)
        .setDescription(description)
}

// Simple with footer
exports.simpleFooter = function (hex, title, description) {
    return new discord.MessageEmbed()
        .attachFiles(['./utils/assets/voyager.png'])
        .setColor(`#${hex}`)
        .setTitle(title)
        .setDescription(description)
        .setFooter(`Voyager ${package.version} - Created by the r/Lab_path Team`, 'attachment://voyager.png')
}

// Reddit post
exports.redditPost = function (hex, title, imgUrl, author, url) {
    return new discord.MessageEmbed()
        .attachFiles(['./utils/assets/voyager.png'])
        .setColor(`#${hex}`)
        .setTitle(title)
        .setImage(imgUrl)
        .setDescription(`Posted by \`u/${author}\``)
        .setURL(`https://reddit.com${url}`)
        .setFooter(`Voyager ${package.version} - Created by the r/Lab_path Team`, 'attachment://voyager.png')
}

// Request Success
exports.requestSuccess = function (data, type, code) {
    return new discord.MessageEmbed()
        .setColor('#38b23a') // Green
        .setTitle('`' + type + '` request with code `' + code + '`')
        .setDescription('```js\n' + data + '\n```')
}

// Request Error
exports.requestError = function (data, type, code) {
    // Generate embed
    const embed = new discord.MessageEmbed()
        .setColor('#cc0000') // Red
        .setTitle('`' + type + '` - Error `' + code + '` has occurred')

    // If not found
    if (code == 404) embed.setDescription('```js\nNot found\n```')
    else embed.setDescription('```js\n' + data + '\n```')

    // Return Embed
    return embed
}

// List roles from guild
exports.listRoles = function (hex, title, roles) {
    // Variables
    let description = 'If you want to be pinged whenever new content is out, please react with the respective role emoji. Removing your reaction will also remove the appropriate role.\n\n'

    // Generate embed
    const embed = new discord.MessageEmbed()
        .setColor(`#${hex}`)
        .setTitle(title)

    // Add roles to description
    if (roles.length == 0) description += 'No roles set up for this server yet!\nUse `@Voyager set role <name> <@role> <emoji>` to add new roles.'
    else for (i of roles) for (j in i)
        description += `${helper.getEmojiAsMentionFromId(i[j].emoji)} - ${helper.getRoleAsMentionFromId(i[j].id)}\n\n`

    // Set description
    embed.setDescription(description)

    // Return
    return embed
}
