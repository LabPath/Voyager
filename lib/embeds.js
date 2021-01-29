// Require: Packages
const discord = require('discord.js')
const config = require('../package.json')

// Simple
exports.simple = function (hex, title, description) {
    return new discord.MessageEmbed()
        .setColor('#' + hex)
        .setTitle(title)
        .setDescription(description)
}

// Simple with footer
exports.simpleFooter = function (hex, title, description) {
    return new discord.MessageEmbed()
        .attachFiles(['./utils/assets/voyager.png'])
        .setColor('#' + hex)
        .setTitle(title)
        .setDescription(description)
        .setFooter(`Voyager ${config.version} - Created by the r/labpath Team`, 'attachment://voyager.png')
}
