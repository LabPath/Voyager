// Require: Packages
require('dotenv').config()
const discord = require('discord.js')
const fs = require("fs")

// Require: Files
require('./database/database')
const config = require('./config.json')
const package = require('./package.json')
const controllerGuild = require('./database/Guild/controller')

// Require: Libs
const echo = require('./lib/echo')
const helper = require('./lib/helper')

// Variables
const client = new discord.Client()
client.commands = new discord.Collection()
let alternatives = {}

// Require: Commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
    // Save commands
    const command = require('./commands/' + file)
    client.commands.set(command.name, command)

    // Custom long names
    alternatives[command.name] = command.alternatives
}
// console.log(client.commands)
// console.log(alternatives)

// TODO: Check for .env file

// Login with Token
client.login(process.env.VOYAGER_TOKEN)

// Start bot
client.once('ready', async function () {
    echo.success('Voyager up and running!')
    echo.info('Running version ' + package.version)

    // Run a subreddit check every 30 mins
    setInterval(() => { helper.checkSubreddits(client) }, config.reddit.lab_path.checkInterval)

    // Get database Guilds
    let dbGuilds = await controllerGuild.get()
    if ('err' in dbGuilds) {
        echo.error(`Getting Guild. Code ${dbGuilds.code}.`)
        echo.error(dbGuilds.err)
    }

    // Cache reaction messages if dbGuilds[i] has a roles channel
    for (i of dbGuilds.data) if (i.channels.roles)
        await client.channels.cache
            .get(i.channels.roles).messages.fetch(i.message_reaction_id)
            .catch(async err => { if (err.message.includes('Unknown')) await controllerGuild.put(i._id, { message_reaction_id: null }) })

    // Events only fire whenever anything has been done in the server.
    // This could be posting a message, reacting to a message other than the role embed, or reacting twice to a single emoji on the role embed.
    // Event messageReactionAdd
    client.on('messageReactionAdd', async function (reaction, user) {
        // Check for bot as author
        if (user.id != config.voyager.client_id)
            await helper.manageRolesByReacting(reaction, user, 'add')
    })
    // Event messageReactionRemove
    client.on('messageReactionRemove', async function (reaction, user) {
        // Check for bot as author
        if (user.id != config.voyager.client_id)
            await helper.manageRolesByReacting(reaction, user, 'remove')
    })
})

// First time entering a Guild
client.on('guildCreate', async function (guild) {
    // Variables
    arrayDevelopers = []

    // Push owner of guild
    arrayDevelopers.push(guild.ownerID)

    // Check if a guild already exists
    const dbGuild = await controllerGuild.getOne({ guild_id: guild.id })

    // Save Guild to database
    if (dbGuild.code == 404) await controllerGuild.post({ guild_id: guild.id, developers: arrayDevelopers })
})

// Leaving a guild
client.on('guildDelete', async function (guild) {
    // Variables
    const dbGuild = await controllerGuild.getOne({ guild_id: guild.id })

    // Remove guild from Database
    if (dbGuild.code != 404 || !'err' in dbGuild) {
        // Remove reaction embed
        if (dbGuild.data.message_reaction_id) {
            const msg = await client.channels.cache
                .get(dbGuild.data.channels.roles).messages.fetch(dbGuild.data.message_reaction_id)
                .catch(async err => { console.log(err) })
            msg.delete()
        }

        // Delete dbGuild from database
        await controllerGuild.delete(dbGuild.data._id)
        echo.info(`Left Guild with ID ${dbGuild.data._id}.`)
    }
})

// Act when command is issued
client.on('message', async function (message) {
    // console.log(message.content)
    // Variables
    const voyagerRoleId = helper.getVoyagerRoleId(message.guild)

    // If message is only a bot ping
    if (message.content == config.voyager.prefix) return message.channel.send(`Use \`@Voyager help\` for a list of commands.`)

    // If message starts with bot prefix or Voyager role and message.author is NOT Voyager 
    if ((message.content.startsWith(config.voyager.prefix) || message.content.startsWith(helper.getRoleAsMentionFromId(voyagerRoleId))) && message.author.id != config.voyager.client_id) {
        // Variables
        const args = message.content.slice(config.voyager.prefix.length).trim().split(/ +/)
        let commandInput = args.shift().toLowerCase()
        // console.log(args)
        // console.log(command)

        // Check if command exists (with aliases)
        const command = client.commands.get(commandInput) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandInput))
        if (!command) return

        // Variables
        dbGuild = null

        // Check if command needs dbGuild
        if (command.needsDatabaseGuild || command.devOnly) {
            // Get Current Guild
            dbGuild = await controllerGuild.getOne({ guild_id: message.guild.id })

            // Not Found
            if (dbGuild.code == 404) {
                // Create new
                dbGuild = await controllerGuild.post({ guild_id: message.guild.id, role_id: voyagerRoleId, developers: message.guild.ownerID })

                // Check for error in dbGuild
                if ('err' in dbGuild) {
                    echo.error(`Creating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                } else message.guild.owner.send(config.texts.resetDatabaseGuild)
            }
            // Check if Voyager role is saved in database
            else if (!dbGuild.data.role_id) {
                // Update 
                controllerGuild.put(dbGuild.data._id, { role_id: voyagerRoleId })

                // Check for error in dbGuild
                if ('err' in dbGuild) {
                    echo.error(`Creating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                }
            }
        }

        // Try to execute it
        try { command.execute(message, args, dbGuild) }
        catch (err) { echo.error(err) }
    }
})
