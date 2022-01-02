// Require: Packages
const tough = require('tough-cookie')

// Require: Libs
const helper = require('../lib/helper')
const axios = require('../lib/axios')

// Require: Files
const config = require('../config.json')
const controllerUser = require('../database/User/controller')
const controllerCodes = require('../database/Code/controller')
const controllerStat = require('../database/Stat/controller')

// Variables
let dbStats = null
let arrayExpired = []

// Set dbStats
controllerStat.getOne().then(async (stat) => {
    // Error
    if ('err' in stat) {
        echo.error(`Getting Stats. Code ${stat.code}.`)
        echo.error(stat.err)
    }
    // Stat does not exist
    else if (stat.code == 404) dbStats = await controllerStat.post()
    else if (stat.code == 200) dbStats = stat
})

// TODO: Would be nice to get notified every time something goes wrong. Can either hardcode to send Zeb a private message, or hardcode to send to a server dedicated to the bot, or idk.

// Exports
module.exports = {
    name: 'redeem',
    aliases: [],
    help: {
        isVisible: true,
        name: 'redeem',
        title: 'Redeem redemption codes.',
        detailedInfo: 'Ask me to redeem code(s) for you. Necessary to have created a `user` account already with `@Voyager user`.',
        usage: 'redeem i<code>',
        example: 'redeem d14m0nd5 311j4hw00d xmasl00t'
    },
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
                // console.log(message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Ask if user is ready for sending verification code
                data = await askIfReady(message, user.data.afk.afk_uids[i])
                // console.log(message.author.username, user.data.afk.afk_uids, user.data.afk.afk_uids[0], user.data.afk.afk_uids[i])

                // Logout first
                if (data) data = await logout(message, cookieJar, user.data.afk.afk_uids[i])
                else return
                // if (data) console.log('Logout', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Send Verification Mail
                // TODO: Remove everything related to sendVerificationMail when sure the game doesn't use it anymore
                /* if (data) data = await sendVerificationMail(message, cookieJar, user.data.afk.afk_uids[i])
                else return */
                // if (data) console.log('Verification Mail', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Ask for verification Code
                if (data) verificationCode = await askVerificationCode(message)
                else return
                // console.log('Verification Code:', data)

                // Send Verification Code
                if (verificationCode) data = await sendVerificationCode(message, cookieJar, user.data.afk.afk_uids[i], verificationCode)
                else return
                // if (data) console.log('Verification Code', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Get alt Accounts
                if (data) data = await getUsersUIDs(message, cookieJar, user.data.afk.afk_uids[i])
                else return
                // if (data) console.log('Users', message.author.username, user.data.afk.afk_uids[i], cookieJar.store.idx)

                // Set Users
                if (data) users = data.data.data.users
                else return

                // Send message
                message.channel.send('**This may take a while**, please be patient.')

                // Iterate over Users
                for (let j = 0; j < users.length; j++) {
                    message.channel.send(`Redeeming for \`${users[j].name} (${users[j].uid})\`...`)
                    data = await redeemCode(cookieJar, users[j], args, message)
                    if (data == 'break_all') break
                    else message.channel.send(data)
                }

                // Check for break_all
                if (data == 'break_all') break

                // Send message
                message.channel.send('Done!')

                // Let Zeb know of codes that have expired to remove them
                for (let i = 0; i < arrayExpired.length; i++) {
                    // Get code
                    controllerCodes.getOne({ code: arrayExpired[i] })
                        .then((codeToBeDeleted) => {
                            // If exists
                            if (codeToBeDeleted.code == 200) {
                                // Message Zeb to delete code
                                message.client.users.fetch(config.creators.Zebiano, false).then((user) => {
                                    user.send(`Code \`${arrayExpired[i]}\` has expired, delete it with \`@Voyager code ${arrayExpired[i]}\`.`)

                                    // Remove entry from array
                                    const index = arrayExpired.indexOf(codeToBeDeleted.data.code)
                                    if (index > -1) arrayExpired.splice(index, 1)
                                })
                            }
                        })
                }
            }
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args
    if (!args[0]) return false
    else return true
}

// Ask if user is ready for verification code
async function askIfReady(message, i) {
    // Ask user if they're sure
    const answer = await helper.askYesOrNo(message, `React when you're ready to send me the verification code for account \`${i}\`.`, 20000)

    // If out of time
    if (answer == false) {
        message.channel.send(`No problem, just run \`@Voyager ${message.content.substring(message.content.indexOf('>') + 1).trim()}\` when you're ready!`)
        return false
    }
    else if (answer == 'out_of_time') {
        message.channel.send(config.texts.outOfTime)
        return false
    } else return answer
}

// Logs user out from redemption codes website
async function logout(message, cookieJar, i) {
    // Variables
    const options = {
        jar: cookieJar
    }

    // Logout
    const res = await axios.get(config.links.redeem.logout + i, options)

    // If something went wrong
    if (res.status != 200 || res.data == undefined || res.data.info != 'ok') {
        console.log('--- Logout ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
    // Success
    else return true
}

// Ask for verification code
async function askVerificationCode(message) {
    // Filter
    const filter = response => {
        if (response.author.id != process.env.VOYAGER_CLIENT_ID && response.content.trim()) return true
        return false
    }

    return await message.channel.send(config.commands.redeem.questions[0]).then(() => {
        return message.channel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] })
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

    // If all is well
    if (res.status == 200 && res.data != undefined) {
        switch (res.data.info) {
            case 'ok': return true
            case 'err_send_mail_too_often':
                message.channel.send(`Lilith says I've been trying too often to redeem codes for you (UID \`${i}\`). Please try again in ${res.data.data.second} seconds.`)
                return false
            default:
                console.log('--- Send Verification Mail ---')
                console.log(res)
                message.channel.send(config.texts.generalError)
                return false
        }
    }
    // If something went wrong
    else {
        console.log('--- Send Verification Mail ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
}

// Sends Verification code to Lilith
async function sendVerificationCode(message, cookieJar, i, verificationCode) {
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

    // If all is well
    if (res.status == 200 && res.data != undefined) {
        switch (res.data.info) {
            case 'ok': return true
            case 'err_code_must_be_valid_string':
                // Variables
                var data = null

                // Send message
                message.channel.send(`Lilith says the code has an invalid format. Please make sure to send a message with the code only (no need to mention the bot)!`)

                // Ask for verification code again
                verificationCode = await askVerificationCode(message)
                if (verificationCode) await sendVerificationCode(message, cookieJar, i, verificationCode)
                if (data) return true
            case 'err_wrong_code':
                // Variables
                var data = null

                // Send message
                message.channel.send(`Lilith says that's a wrong code. Please try again.`)

                // Ask for verification code again
                verificationCode = await askVerificationCode(message)
                if (verificationCode) data = await sendVerificationCode(message, cookieJar, i, verificationCode)
                if (data) return true
            default:
                console.log('--- Send Verification Code ---')
                console.log(res)
                message.channel.send(config.texts.generalError)
                return false
        }
    }
    // If something went wrong
    else {
        console.log('--- Send Verification Code ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
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

    // If all is well
    if (res.status == 200 && res.data != undefined) {
        switch (res.data.info) {
            case 'ok': return res
            default:
                console.log('--- Get User UIDs ---')
                console.log(res)
                message.channel.send(config.texts.generalError)
                return false
        }
    }
    // If something went wrong
    else {
        console.log('--- Get User UIDs ---')
        console.log(res)
        message.channel.send(config.texts.generalError)
        return false
    }
}

// Redeem code for user
async function redeemCode(cookieJar, user, args, message) {
    // Variables
    let description = `\`\`\`ini\n`

    // Iterate over args (codes)
    for (let i = 0; i < args.length; i++) {
        // Variables
        const body = {
            type: "cdkey_web",
            game: "afk",
            uid: user.uid,
            cdkey: args[i]
        }
        const options = {
            jar: cookieJar
        }

        // Request
        const res = await axios.post(config.links.redeem.consume, body, options)
        if (dbStats) controllerStat.put(dbStats.data._id, { $inc: { 'redemption_codes.totalAttempts': 1 } })

        // If all is well
        if (res.status == 200 && res.data != undefined) {
            switch (res.data.info) {
                case 'ok':
                    description += `"${args[i]}" = "Redeemed!"\n`
                    if (dbStats) controllerStat.put(dbStats.data._id, { $inc: { 'redemption_codes.totalRedeemed': 1 } })
                    break
                case 'err_cdkey_expired':
                    description += `"${args[i]}" = "Has expired."\n`
                    if (!arrayExpired.includes(args[i])) arrayExpired.push(args[i])
                    break
                case 'err_cdkey_batch_error':
                    description += `"${args[i]}" = "Already claimed."\n`
                    break
                case 'err_cdkey_record_not_found':
                    description += `"${args[i]}" = "Invalid code."\n`
                    break
                default:
                    console.log('--- Redeem Code ---')
                    console.log(res)
                    message.channel.send(config.texts.generalError)
                    return 'break_all'
            }
        }
        // If something went wrong
        else {
            console.log('--- Redeem Code ---')
            console.log(res)
            message.channel.send(config.texts.generalError)
            return 'break_all'
        }
        
        // Wait ms before attempting to redeem another code for the same "server" (account)
        if (args.length > 1) await helper.wait(config.timings.lilithApi.redeemNewCode)
    }

    // Add end of code block
    description += '```'

    // Return description
    return description
}
