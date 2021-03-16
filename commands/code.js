// Require: Libs
const embeds = require('../lib/embeds')
const helper = require('../lib/helper')

// Require: Files
const config = require('../config.json')
const controllerCodes = require('../database/Code/controller')

// Exports
module.exports = {
    name: 'code',
    aliases: [],
    permissions: [],
    devOnly: false,
    trusted: true,
    needsDatabaseGuild: true,
    channelTypes: ['text', 'news'],
    async execute(message, args, dbGuild) {
        // Check for Bot permissions
        const objectPermissions = helper.checkBotPermissions(message, this.permissions)
        if (objectPermissions.necessary.length != 0)
            return message.channel.send(helper.generatePermissionLink(objectPermissions, message))
        // If devOnly == true and user has permissions
        if (this.devOnly && !dbGuild.data.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // If trusted == true and user has permissions
        if (this.trusted && !dbGuild.data.trusted.includes(message.author.id) && !dbGuild.data.developers.includes(message.author.id))
            return message.channel.send(config.texts.userLacksPerms)
        // Check if in correct channel type
        if (!helper.checkChannelType(message, this.channelTypes))
            return message.channel.send(config.texts.wrongChannel)
        // Check if arguments are correct
        args = helper.cleanArgs(args)
        if (!checkCommandArguments(args))
            return message.channel.send(config.texts.wrongCommandUsage)

        // A ideia e user code <code> <date> <emoji><amount> <emoji> <amount> <emoji2> <amount2>
        // Trusted users podem tambem usar isto para criar codigos novos
        // Codigos novos sao gravados na base de dados
        // Sempre que e usado este command, o bot cria a informacao no #redemption-codes
        // Sempre que e usado este command, o bot manda DM a quem disse que queria receber DM a dizer "Run `@Voyager <code>` for free goodies! Expires on <date>."

        // Check if code exists in DB
        let code = await controllerCodes.getOne({ code: args[0] })
        if ('err' in code) {
            echo.error(`Getting Code. Code ${code.code}.`)
            echo.error(code.err)
            return message.channel.send(config.texts.generalError)
        }
        // Code does not exist, create new one
        else if (code.code == 404) {
            // Create new code
            code = await controllerCodes.post(generateCode(args))
            if ('err' in code) {
                echo.error(`Creating Code. Code ${code.code}.`)
                echo.error(code.err)
                return message.channel.send(config.texts.generalError)
            }
            // Success
            else {
                // Variables
                const info = helper.generateRedemptionCodesInfo(code.data.code, code.data.expiration_date, code.data.rewards)
                const description = `${info.code}\n${info.body}`

                // Send embed
                message.channel.send(embeds.simple(config.colors.success, config.texts.code.successCreatingNew, description))
            }
        }
        // Code exists
        else if (code.code == 200) {
            // Variables
            const info = helper.generateRedemptionCodesInfo(code.data.code, code.data.expiration_date, code.data.rewards)
            const description = `${info.code}\n${info.body}`

            // Send embed
            message.channel.send(config.texts.code.alreadyExists)
            await showCode(message, description, code, args)
        }
    }
}

/* --- Functions --- */
// Check if arguments are correct
function checkCommandArguments(args) {
    // Check for args
    if (!args[0] || !args[1] || !args[2] || !args[3]) return false
    // Check for Emoji
    else if (!helper.getIdFromMention(args[2])) return false
    else return true
}

/* --- Functions --- */
// Create new Code
function generateCode(args) {
    // Variables
    let body = {
        code: args[0],
        expiration_date: args[1],
        rewards: []
    }

    // Iterate args
    for (let i = 2; i < args.length; i += 2) {
        // Push to rewards array
        body.rewards.push({
            emoji: helper.getIdFromMention(args[i]),
            amount: args[i + 1].toUpperCase()
        })
    }

    // Return
    return body
}


// Show embed with info and ask to update or delete or quit
async function showCode(message, description, code, args) {
    // Variables
    const filter = (reaction, user) => {
        if (user.id === message.author.id && (reaction.emoji.name === '🔄' || reaction.emoji.name === '❌' || reaction.emoji.name === '🇶')) return true
        return false
    }

    // Send embed
    message.channel.send(embeds.simple(config.colors.success, config.texts.code.successFound, description)).then((msg) => {
        msg.react('🔄')
        msg.react('❌')
        msg.react('🇶')
        msg.awaitReactions(filter, { max: 1, time: 10000, errors: ['time'] })
            .then(async collected => {
                // Update
                if (collected.first()._emoji.name == '🔄') updateCode(message, code, args)
                // Delete
                else if (collected.first()._emoji.name == '❌') deleteCode(message, code)
                // Quit
                else if (collected.first()._emoji.name == '🇶') return message.channel.send('Got it, quitting.')
            })
            .catch(collected => {
                msg.channel.send(config.texts.outOfTime)
            })
    })
}

// Update redemption code
async function updateCode(message, code, args) {
    // Update info
    code = await controllerCodes.put(code.data._id, generateCode(args))
    if ('err' in code) {
        echo.error(`Updating Code. Code ${code.code}.`)
        echo.error(code.err)
        return message.channel.send(config.texts.generalError)
    }
    // Success
    else {
        // Variables
        const info = helper.generateRedemptionCodesInfo(code.data.code, code.data.expiration_date, code.data.rewards)
        const description = `${info.code}\n${info.body}`

        // Send embed
        message.channel.send(embeds.simple(config.colors.success, config.texts.code.successUpdating, description))
    }
}

// Delete redemption code
async function deleteCode(message, code) {
    // Update info
    code = await controllerCodes.delete({ _id: code.data._id })
    if ('err' in code) {
        echo.error(`Deleting Code. Code ${code.code}.`)
        echo.error(code.err)
        return message.channel.send(config.texts.generalError)
    }
    // Success
    else {
        // Send embed
        message.channel.send(`Successfully deleted code \`${code.data.code}\``)
    }
}
