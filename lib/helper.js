// Require: Files
const echo = require('./echo')

// Get User from Mention
exports.getUserFromMention = function (mention) {
    // Check for mention
    if (!mention) return false

    // Check for correct mention
    if (mention.startsWith('<@') && mention.endsWith('>')) {
        // Cut beginning and end
        mention = mention.slice(2, -1)

        // If a '!' is present, cut that
        if (mention.startsWith('!')) {
            mention = mention.slice(1)
        }

        // Return
        return mention
    }
}

// Get user as mention
exports.getUserAsMention = function (id) {
    // Check for mention
    if (!id) return

    // Return
    return '<@' + id + '>'
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
        .then(function (role) { echo.success('Created new role: ' + role) })
        .catch(function (err) { console.log(err); return err.message })
}

// Create a new emoji from an url
exports.createEmoji = async function (guild, url, name) {
    await guild.emojis.create(url, name)
        .then(function (emoji) { echo.success('Created new emoji: ' + name) })
        .catch(function (err) { console.log(err); return err.message })
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
