// Require: Packages
const tough = require('tough-cookie')

// Require: Libs
const helper = require('../lib/helper')
const axios = require('../lib/axios')

// Require: Files
const config = require('../config.json')
const controllerUser = require('../database/User/controller')

/**
 * 38536241 {}
 * 8582007 {}
 * 8997329 {}
 * Logout 8997329 {undefined}
 * Logout 8997329 {undefined}
 * Logout 8997329 {undefined}
 * Verification Mail 8997329 {defined}
 * Verification Code 8997329 {defined}
 * Users 8997329 {defined}
 * ----
 * When Zeb got asked to send his verification, tester got told Zebs UID is out of seconds
 * Zeb's Tester 12947357 {}
 * Zebiano 38536241 {}
 * Logout Zebiano 38536241 {undefined}
 * Verification Mail Zebiano 38536241 {defined}
 * Logout Zeb's Tester 38536241 {undefined}
 * ----
 * Quickly react first Zeb then Tester.
 * Zebiano 38536241 {}
 * Zeb's Tester 12947357 {}
 * Logout Zebiano 12947357 {undefined}
 * Verification Mail Zebiano 12947357 {defined}
 * logout Zeb's Tester 12947357 {undefined}
 * ----
 * Quickly react first Zeb then Tester. When Zeb got asked to send his verification, tester got told hes out of seconds
 * Zebiano 38536241 {}
 * Zeb's Tester 12947357 {}
 * Logout Zebiano 12947357 {undefined}
 * Verification Mail Zebiano 12947357 {defined}
 * Logout Zeb's Tester 12947357 {undefined}
 * ----
 * Quickly react first Zeb then Tester. When Zeb got asked to send his verification, tester got told hes out of seconds
 * Zebiano 38536241 {}
 * Zeb's Tester 12947357 {}
 * Logout Zebiano 12947357 {undefined}
 * Verification Mail Zebiano 12947357 {defined}
 * Logout Zeb's Tester 12947357 {undefined}
 * ----
 * React for Zeb and wait for verification code message before reacting on Tester.
 * When Zeb got asked to send his verification and after tester reacting, tester got told hes out of seconds.
 * Tester UID is actually on cooldown. Though Zebs isn't.
 * Zebiano 38536241 {}
 * Zeb's Tester 12947357 {}
 * Logout Zebiano 12947357 {undefined}
 * Verification Mail Zebiano 12947357 {defined}
 * Logout Zeb's Tester 12947357 {undefined}
 * ---
 * From the tests above, I've come to the conclusion i (UIDs) are not getting tracked correctly.
 * The i (UID) being used is always the last one from reacting with the ready emoji.
 * ----
 * I think I fixed it!
 * Using for (i of array) was messing up and i was being passed onto other "instances"
 * Though using for (let i = 0; i < array; i++) and then array[i] seems to work
 */

// Exports
module.exports = {
    name: 'redeem',
    aliases: [],
    permissions: [],
    devOnly: false,
    needsDatabaseGuild: false,
    channelTypes: ['dm'],
    // TODO: Anyone can redeem and it also tries to redeem on other users
    // TODO: Create some sort of counter
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

        // Check if user already exists in DB
        let user = await controllerUser.getOne({ discord_id: message.author.id })
        // If error
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
            for (let i = 0; i < user.data.afk.afk_uids.length; i++) {
                // Variables
                let data = null
                let users = null
                let verificationCode = null

                // Create new Cookie Jar
                const cookieJar = new tough.CookieJar()
                console.log(message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Ask if user is ready for sending verification code
                data = await askIfReady(message, user.data.afk.afk_uids[i])
                console.log(message.author.username, user.data.afk.afk_uids, user.data.afk.afk_uids[0], user.data.afk.afk_uids[i])

                // Logout first
                if (data) data = await logout(message, cookieJar, user.data.afk.afk_uids[i])
                else return
                if (data) console.log('Logout', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Send Verification Mail
                if (data) data = await sendVerificationMail(message, cookieJar, user.data.afk.afk_uids[i])
                else return
                if (data) console.log('Verification Mail', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Ask for verification Code
                if (data) verificationCode = await askVerificationCode(message)
                else return
                console.log('Verification Code:', data)

                // Send Verification Code
                if (verificationCode) data = await sendVerificationCode(message, cookieJar, user.data.afk.afk_uids[i], verificationCode)
                else return
                if (data) console.log('Verification Code', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Get alt Accounts
                if (data) data = await getUsersUIDs(message, cookieJar, user.data.afk.afk_uids[i])
                else return
                if (data) console.log('Users', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Set Users
                if (data) users = data.data.data.users
                else return

                // Send message
                message.channel.send('Working on it...')

                // Iterate over Users
                for (let j = 0; j < users.length; j++) {
                    data = await redeemCode(cookieJar, users[j], args)
                    if (data == 'break_all') break
                    else message.channel.send(data)
                }

                // Check for break_all
                if (data == 'break_all') break

                // Send message
                message.channel.send('Done!')
            }
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args
    if (!args) return false
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

// Ask if user is ready for verification code
async function askIfReady(message, i) {
    // Filter
    const filter = (reaction, user) => {
        if (user.id === message.author.id && reaction.emoji.name === '👍') return true
        return false
    }

    // Ask
    return await message.channel.send(`React when you're ready to receive the verification code for account \`${i}\`.`).then((msg) => {
        msg.react('👍')
        return msg.awaitReactions(filter, { max: 1, time: 20000, errors: ['time'] })
            .then(async collected => { return true })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)
                return false
            })
    })
}

// Logs user out from redemption codes website
async function logout(message, cookieJar, i) {
    // Variables
    const options = {
        jar: cookieJar
    }

    // TODO: Aproveitar para ver porque e que se o tempo acabar no emoji de "im ready" ele nao sair do command e continuar o codigo aseguir
    const res = await axios.get(config.links.redeem.logout + i, options)
    // Not OK
    if (res.data.info != 'ok') {
        console.log('--- Logout ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    } else return true
}

// Send a verification code to in-game mail
async function sendVerificationMail(message, cookieJar, i) {
    // Variables
    const body = {
        game: 'afk',
        uid: i
    }
    const options = {
        jar: cookieJar
    }

    // Request
    const res = await axios.post(config.links.redeem.sendMail, body, options)

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
    else return true
}

// Sends Verification code to Lilith
async function sendVerificationCode(message, cookieJar, i, verificationCode) {
    // TODO: remove mention from verificationCode when it exists
    // Variables
    const body = {
        game: 'afk',
        uid: i,
        code: verificationCode
    }
    const options = {
        jar: cookieJar
    }

    // Request
    const res = await axios.post(config.links.redeem.verifyCode, body, options)

    // Wrong Verification Code
    if (res.data.info == 'err_wrong_code') {
        message.channel.send(`Lilith says that's a wrong code. Please try again.`)
        verificationCode = await askVerificationCode(message)
        if (verificationCode) await sendVerificationCode(message, cookieJar, i, verificationCode)
    }
    // Code is not a valid string
    else if (res.data.info == 'err_code_must_be_valid_string') {
        message.channel.send(`Lilith says the code has an invalid format. Please make sure to send a message with the code only (no need to mention the bot)!`)
        verificationCode = await askVerificationCode(message)
        if (verificationCode) await sendVerificationCode(message, cookieJar, i, verificationCode)
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
async function getUsersUIDs(message, cookieJar, i) {
    // Variables
    const body = {
        game: 'afk',
        uid: i
    }
    const options = {
        jar: cookieJar
    }

    // Request
    const res = await axios.post(config.links.redeem.users, body, options)

    // Not OK
    if (res.data.info != 'ok') {
        console.log('--- Get User UIDs ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
    // Success
    else return res
}

// Redeem code for user
async function redeemCode(cookieJar, user, args) {
    // Variables
    let description = `\`\`\`json\n${user.name} (${user.uid}): {\n`

    // Iterate over args (codes)
    for (i of args) {
        // Variables
        const body = {
            type: "cdkey_web",
            game: "afk",
            uid: user.uid,
            cdkey: i
        }
        const options = {
            jar: cookieJar
        }

        // Request
        const res = await axios.post(config.links.redeem.consume, body, options)

        // Expired Code
        if (res.data.info == 'err_cdkey_expired') {
            description += `  "${i}": "Has expired.",\n`
        }
        // Already redeemed code
        else if (res.data.info == 'err_cdkey_batch_error') {
            description += `  "${i}": "Already claimed.",\n`
        }
        // Code invalid
        else if (res.data.info == 'err_cdkey_record_not_found') {
            description += `  "${i}": "Invalid code.",\n`
        }
        // Not OK
        else if (res.data.info != 'ok') {
            console.log('--- Redeem Code ---')
            console.log(res)
            message.channel.send(config.texts.generalError)
            return 'breakAll'
        }
        // Success
        else description += `  "${i}": "Redeemed!",\n`
    }

    // Add end of code block
    description += '}```'

    // Return description
    return description
}
