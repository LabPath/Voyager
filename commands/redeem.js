// Require: Libs
const helper = require('../lib/helper')
const axios = require('../lib/axios')

// Require: Files
const config = require('../config.json')
const controllerUser = require('../database/User/controller')

// Exports
module.exports = {
    name: 'redeem',
    aliases: [],
    permissions: [],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm'],
    async execute(message, args, dbGuild) {
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes)) {
            message.delete()
            message.client.users.fetch(message.author.id, false).then((user) => {
                user.send('Please run `@Voyager redeem` here, instead of a server.')
            })
            return
        }
        // Check if arguments are correct
        if (!checkCommandArguments(args))
            return message.channel.send(config.texts.wrongCommandUsage)

        // Send message
        message.channel.send('Working on it...')

        // Check if user already exists in DB
        let user = await controllerUser.getOne({ discord_id: message.author.id })
        if ('err' in user) {
            echo.error(`Getting User. Code ${user.code}.`)
            echo.error(user.err)
            return message.channel.send(config.texts.generalError)
        }
        // User does not exist
        else if (user.code == 404) {
            message.client.users.fetch(message.author.id, false).then((user) => {
                user.send('Please run `@Voyager user` in DMs first!')
            })
        }
        // User exists
        else if (user.code == 200) {
            // Iterate over user UIDs
            for (i of user.data.afk.afk_uids) {
                // Variables
                let data = null
                let users = null

                data = await logout(message, i) // Logout first
                if (data) data = await sendVerificationMail(message, i) // Ask for Verification Mail
                if (data) data = await sendVerificationCode(message, i, data) // Send Verification Code
                if (data) users = await getUsersUIDs(message, i) // Get alt Accounts

                // Iterate over Users
                if (users) for (j of users) {
                    data = await redeemCode(j, args[0])
                    if (data == 'break_all') break
                    else message.channel.send(data)
                }

                // Check for break_all
                if (data == 'break_all') break
            }
            // TODO: Anyone can redeem and it also tries to redeem on other users   
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args[0]
    if (!args[0]) return false
    else return true
}

// Ask for verification code
async function askVerificationCode(message) {
    // Filter
    const filter = response => {
        if (response.content.trim()) return true
        return false
    }

    return await message.channel.send(config.commands.redeem.questions[0]).then(() => {
        return message.channel.awaitMessages(filter, { max: 1, time: 70000, errors: ['time'] })
            .then(collected => {
                // Return
                return collected.first().content.trim()
            })
            .catch(collected => {
                message.channel.send(config.texts.outOfTime)
                return false
            })
    })
}

// Logs user out from redemption codes website
async function logout(message, i) {
    res = await axios.get(config.commands.redeem.axios.logout + i)
    // Not OK
    if (res.data.info != 'ok') {
        console.log('--- Logout ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    } else return true
}

// Send a verification code to in-game mail
async function sendVerificationMail(message, i) {
    // Variables
    const body = {
        game: 'afk',
        uid: i
    }

    // Request
    res = await axios.post(config.commands.redeem.axios.sendMail, body)

    // Send mail too often
    if (res.data.info == 'err_send_mail_too_often') {
        message.channel.send(`Lilith says I've been trying too often to redeem codes for you (UID \`${i}\`). Please try again in ${res.data.data.second} seconds.`)
        return false
    }
    // Not OK
    else if (res.data.info != 'ok') {
        console.log('--- Send Verification Mail ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
    // Success
    else return verificationCode = await askVerificationCode(message)
}

// Sends Verification code to Lilith
async function sendVerificationCode(message, i, verificationCode) {
    // Variables
    const body = {
        game: 'afk',
        uid: i,
        code: verificationCode
    }

    // Request
    res = await axios.post(config.commands.redeem.axios.verifyCode, body)

    // Wrong Verification Code
    if (res.data.info == 'err_wrong_code') {
        message.channel.send(`Lilith says that's a wrong code. Please try again.`)
        verificationCode = await askVerificationCode(message)
        await sendVerificationCode(message, i, verificationCode)
    }
    // Not OK
    else if (res.data.info != 'ok') {
        console.log('--- Send Verification Code ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
    // Success
    else return true
}

// Gets all the UIDs from logged in user
async function getUsersUIDs(message, i) {
    // Variables
    const body = {
        game: 'afk',
        uid: i
    }

    // Request
    res = await axios.post(config.commands.redeem.axios.users, body)

    // Not OK
    if (res.data.info != 'ok') {
        console.log('--- Get User UIDs ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
    // Success
    else return res.data.data.users
}

// Redeem code for user
async function redeemCode(user, code) {
    // Variables
    const body = {
        type: "cdkey_web",
        game: "afk",
        uid: user.uid,
        cdkey: code
    }

    // Request
    res = await axios.post(config.commands.redeem.axios.redeem, body)
    console.log(res.data)

    // Expired Code
    if (res.data.info == 'err_cdkey_expired') {
        return 'breakAll'
    }
    // Already redeemed code
    else if (res.data.info == 'err_cdkey_batch_error') {
        return `\`\`\`js\n${user.name}(${user.uid}): Already claimed\`\`\``
    }
    // Not OK
    else if (res.data.info != 'ok') {
        console.log('--- Redeem Code ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return 'breakAll'
    }
    // Success
    else return `\`\`\`js\n${user.name}(${user.uid}): Redeemed\`\`\``
}
