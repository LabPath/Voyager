// Require: Packages
const discord = require('discord.js')
const axios = require('axios')

// Require: Libs
const echo = require('./echo')
const embeds = require('./embeds')

// Require: Files
const config = require('../config.json')
const controllerGuild = require('../database/Guild/controller')

// Get User from Mention
exports.getIdFromMention = function (mention) {
    // Variables
    let arrayMentions = []
    let arrayResult = []

    // Check for Array
    if (!Array.isArray(mention)) arrayMentions.push(mention)

    // Add to array
    for (i of arrayMentions) {
        // Mention or Role
        if (i.startsWith('<@') && i.endsWith('>')) {
            // Cut beginning and end
            i = i.slice(2, -1)

            // If a '!' is present, cut that
            if (i.startsWith('!') || i.startsWith('&')) i = i.slice(1)

            // Push to array
            arrayResult.push(i)
        }
        // Emoji
        else if (i.startsWith('<:') && i.endsWith('>')) {
            // Cut beginning and end
            i = i.slice(2, -1)

            // Push to array
            arrayResult.push(i)
        }
        // Return undefined
        else return undefined
    }

    // Return array (or string if only one entry in array)
    if (arrayResult.length == 1) return arrayResult[0]
    else return arrayResult
}

// Get user as mention
exports.getUserAsMentionFromId = function (id) {
    // Return
    return `<@!${id}>`
}

// Get role as mention
exports.getRoleAsMentionFromId = function (id) {
    // Return
    return `<@&${id}>`
}

// Get channel as mention
exports.getChannelAsMentionFromId = function (id) {
    // Return
    return `<#${id}>`
}

// Get emoji as "mention"
exports.getEmojiAsMentionFromId = function (id) {
    // Return
    return `<:${id}>`
}

// Generate clean args array
exports.cleanArgs = function (args) {
    // Variables
    let newArgs = []
    let temp = ''

    // For loop of args
    for (i of args) {
        // If " is included
        if (i.includes('"')) {
            // If " are at the beginning and ending
            if (i.substring(0, 1) == '"' && i.substring(i.length - 1) == '"') {
                temp += i.substring(1, i.length - 1) // Remove " at the beginning and end
                newArgs.push(temp) // Push temp to newArgs array
                temp = '' // Reset temp
            }
            else {
                // If temp is not set yet
                if (!temp) temp += i.substring(1) + ' ' // Add to temp
                else {
                    i = i.substring(0, i.length - 1) // Remove " at the end of i
                    newArgs.push(temp += i) // Push temp to newArgs array
                    temp = '' // Reset temp
                }
            }
        }
        else {
            if (temp) temp += i + ' ' // Add to temp
            else newArgs.push(i) // Push temp to newArgs array
        }
    }
    return newArgs
}

// Create a new role
exports.createRole = async function (guild, options) {
    await guild.roles.create(options)
        .then(function (role) { echo.success(`Created new role: ${role}`) })
        .catch(function (err) { console.log(err); return err.message })
}

// Create a new emoji from an url
exports.createEmoji = async function (guild, url, name) {
    // TODO: Check if guild can save new emojis (max number of emoji (depends on boost level))
    // TODO: Check if emoji already exists
    return await guild.emojis.create(url, name)
        .then(function (emoji) { echo.success(`Created new emoji: ${emoji}`); return emoji })
        .catch(function (err) { throw new Error(err) })
}

// Add role to given user ID
exports.addRoleToUser = async function (guild, roleName, userId) {
    const role = guild.roles.cache.find(function (role) { if (role.name == roleName) return role })
    const user = guild.member(userId)
    await user.roles.add(role)
        .then(function (role) { echo.success('Added user to: ' + role) })
        .catch(function (err) { console.log(err); return err.message })
}

// Check role from a given user ID
exports.checkForRole = function (guild, roleName, userId) {
    if (guild.member(userId).roles.cache.find(r => r.name === roleName)) return true
    else return false
}

// Check permissions of ID
exports.checkBotPermissions = function (message, permissions) {
    // Variables
    let objectPermissions = { necessary: [], unnecessary: [] }

    // Check for necessary permissions
    for (i of permissions) if (!message.guild.me.hasPermission(i)) objectPermissions.necessary.push(i)

    // Check for unnecessary permissions in case bot is missing some necessary ones
    if (objectPermissions.necessary.length != 0) for (i of config.permissions.unnecessary) if (message.guild.me.hasPermission(i)) objectPermissions.unnecessary.push(i)

    // In case object is empty return true
    return objectPermissions
}

// Generate a link with necessary permissions for the bot
exports.generatePermissionLink = function (objectPermissions, message) {
    // Variables
    let permInteger = message.guild.me.permissions.bitfield

    // Add necessary permission to permInteger
    if (objectPermissions.necessary.includes('ADMINISTRATOR')) permInteger = 8
    else for (i of objectPermissions.necessary) permInteger = permInteger + discord.Permissions.FLAGS[i]

    // Remove unnecessary permissions
    if (objectPermissions.unnecessary.length != 0) for (i of objectPermissions.unnecessary) permInteger = permInteger - discord.Permissions.FLAGS[i]

    // Return URL
    return `${config.texts.botLacksPerms}\n<https://discord.com/oauth2/authorize?client_id=804537849747734578&scope=bot&permissions=${permInteger}>`
}

// Check if bot is being called in correct channel type
exports.checkChannelType = function (message, channelTypes) {
    if (channelTypes.includes(message.channel.type)) return true
    else return false
}

// Check if latest subreddit post is a new one
exports.checkSubreddits = function (client) {
    axios.get('http://www.reddit.com/r/lab_path/new.json?limit=1')
        .then(async function (res) {
            // Variables
            const id = res.data.data.children[0].data.id
            const author = res.data.data.children[0].data.author
            const title = res.data.data.children[0].data.title
            const url = res.data.data.children[0].data.permalink
            const imgUrl = res.data.data.children[0].data.url
            const flairText = res.data.data.children[0].data.link_flair_richtext[1].t.trim()

            // Get database Guilds
            const dbGuilds = await controllerGuild.get()
            // Check for error in dbGuilds
            if ('err' in dbGuilds) {
                echo.error(`Getting Guilds. Code ${dbGuild.code}.`)
                echo.error(dbGuilds.err)
                return message.channel.send(config.texts.generalError)
            }

            // Check every reddit channel from dbGuilds
            for (i of dbGuilds.data) {
                // Role ID
                let roleId = null
                for (j of i.roles) {
                    // TODO: This is hardcoded. Which is sad. But in order to change this, a lot would have to change (the whole dbGuild.roles array...)
                    if (flairText == 'Dismal Maze') roleId = j.dismal_maze.id
                    else if (flairText == 'Arcane Labyrinth') roleId = j.arcane_labyrinth.id
                    break
                }

                // Send message
                if (i.channels.reddit) {
                    client.channels.cache.get(i.channels.reddit).messages.fetch({ limit: 1 }).then(messages => {
                        // Check if ID of last post in reddit channel is the same as last subreddit post ID
                        if (((messages.size == 0 || !messages.first().embeds[0]) && config.reddit.lab_path.postFlairs.includes(flairText)) ||
                            (module.exports.getRedditIdFromUrl(messages.first().embeds[0].url) != id && config.reddit.lab_path.postFlairs.includes(flairText))) {
                            // Variables
                            const channel = client.channels.cache.get(i.channels.reddit)

                            // Check for channel type and post (and publish if possible)
                            channel.send(exports.getRoleAsMentionFromId(roleId))
                            if (channel.type === 'news') channel.crosspost(embeds.redditPost(config.colors.blue, title, imgUrl, author, url)).catch((err) => { console.log(err) })
                            else channel.send(embeds.redditPost(config.colors.blue, title, imgUrl, author, url)).catch((err) => { console.log(err) })
                        }
                    })
                }
            }
        }).catch(function (err) { console.log(err) })
}

// Get Reddit post id from URL
exports.getRedditIdFromUrl = function (url) {
    url = url.substring(0, url.length - 1)
    url = url.substring(url.indexOf('/comments') + 10, url.lastIndexOf('/'))
    return url
}

// Get Voyager Role ID
exports.getVoyagerRoleId = function (guild) {
    return guild.roles.cache.find(role => role.name == guild.client.user.username && role.managed == true).id
}

// Add role when reacting to emoji
exports.manageRolesByReacting = async function (reaction, user, type) {
    // Get database Guild
    let dbGuild = await controllerGuild.getOne({ guild_id: reaction.message.channel.guild.id }) // TODO: Check if there's a better way to handle Database request. Making a request EVERY TIME SOMEONE reacts on ANY message does not seem good at all.
    if ('err' in dbGuild) {
        echo.error(`Getting Guild. Code ${dbGuild.code}.`)
        echo.error(dbGuild.err)
    }

    // Check for message_reaction_id
    if (reaction.message.id == dbGuild.data.message_reaction_id) {
        // Variables
        let roleId = null

        // Get roleId
        for (i of dbGuild.data.roles) {
            for (j in i) {
                if (i[j].emoji.includes(reaction.emoji.id)) {
                    roleId = i[Object.keys(i)[0]].id
                    break
                }
            }
        }

        // Find role and member
        const role = reaction.message.guild.roles.cache.get(roleId)
        const member = reaction.message.guild.members.cache.find(member => member.id === user.id)

        // Check Variables
        if (role && member && member.id != process.env.VOYAGER_CLIENT_ID) {
            // Add role to member if not already attributed
            if (type == 'add' && !member.roles.cache.get(role.id)) {
                member.roles.add(role.id)
                reaction.message.channel
                    .send(`Welcome to \`${role.name}\`, ${exports.getUserAsMentionFromId(user.id)}!`)
                    .then(msg => { msg.delete({ timeout: config.timings.msgDelete }) })
            }
            // Remove role from member if possible
            else if (type == 'remove' && member.roles.cache.get(role.id)) {
                member.roles.remove(role.id)
                reaction.message.channel
                    .send(`Sad to see you go ${exports.getUserAsMentionFromId(user.id)}, \`${role.name}\` will miss you!`)
                    .then(msg => { msg.delete({ timeout: config.timings.msgDelete }) })
            }
        }
    }
}
