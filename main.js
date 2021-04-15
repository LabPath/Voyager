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

// TODO: Check how for loops scope variables. I tend to use for (i of array) a lot, but if that fucks up because a lot of people use the same command at the same time, we have a problem.

// Check for .env file
if (!fs.existsSync('./.env')) echo.error('No .env file found! Please create one.', true)
else {
    // Check for data inside .env file
    if (!process.env.VOYAGER_TOKEN) echo.error('.env missing VOYAGER_TOKEN!', true)
    else if (!process.env.VOYAGER_CLIENT_ID) echo.error('.env missing VOYAGER_CLIENT_ID!', true)
    else if (!process.env.VOYAGER_PREFIX) echo.error('.env missing VOYAGER_PREFIX!', true)
    else if (!process.env.VOYAGER_DB_USER) echo.error('.env missing VOYAGER_DB_USER!', true)
    else if (!process.env.VOYAGER_DB_PASSWORD) echo.error('.env missing VOYAGER_DB_PASSWORD!', true)
    else if (!process.env.VOYAGER_DB_NAME) echo.error('.env missing VOYAGER_DB_NAME!', true)
}

// Require: Commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
    // Save commands
    const command = require('./commands/' + file)
    client.commands.set(command.name, command)
}
// console.log(client.commands)

// Login with Token
client.login(process.env.VOYAGER_TOKEN)

// Start bot
client.once('ready', async function () {
    echo.success(`${process.env.VOYAGER_DB_NAME} up and running!`)
    echo.info('Running version ' + package.version)

    // Set activity
    await client.user.setActivity(`v${package.version}`, { type: 'PLAYING' })

    // Run a r/Lab_path check every 15 mins
    setInterval(() => {
        // Change activity
        if (client.user.presence.activities[0].type == 'PLAYING') client.user.setActivity('r/Lab_path', { type: 'WATCHING' })
        else if (client.user.presence.activities[0].type == 'WATCHING') client.user.setActivity(`v${package.version}`, { type: 'PLAYING' })

        // Check for latest Dismal and Lab Maps
        // TODO: Check if dismal and arcane roles are set before running checkLabMaps()
        helper.checkLabMaps(client)
    }, config.timings.reddit.lab_path)

    // Run a r/afkarena check every 3 hours and 10 mins
    setInterval(() => {
        // Check for latest afk.guide maintainer post with flair "Guide"
        helper.checkAfkGuideMaps(client)
    }, config.timings.reddit.afkarena)

    // Get database Guilds
    let dbGuilds = await controllerGuild.get()
    if ('err' in dbGuilds) {
        echo.error(`Getting Guild. Code ${dbGuilds.code}.`)
        echo.error(dbGuilds.err)
    }

    // Cache reaction messages if dbGuilds[i] has a roles channel
    for (i of dbGuilds.data) if (i.channels && i.channels.roles) {
        await client.channels.cache
            .get(i.channels.roles).messages.fetch(i.message_reaction_id)
            .catch(async err => { if (err.message.includes('Unknown')) await controllerGuild.put(i._id, { message_reaction_id: null }) })
    }

    // Events only fire whenever anything has been done in the server.
    // This could be posting a message, reacting to a message other than the role embed, or reacting twice to a single emoji on the role embed.
    // TODO: I think it has something to do with what server is first/second/etc saved in the database? Something like that. But definitely one server works instantly and the other only after updating.
    // Event messageReactionAdd
    client.on('messageReactionAdd', async function (reaction, user) {
        // Check for bot as author
        if (user.id != process.env.VOYAGER_CLIENT_ID && reaction.message.channel.type != 'dm')
            await helper.manageRolesByReacting(reaction, user, 'add')
    })
    // Event messageReactionRemove
    client.on('messageReactionRemove', async function (reaction, user) {
        // Check for bot as author
        if (user.id != process.env.VOYAGER_CLIENT_ID && reaction.message.channel.type != 'dm')
            await helper.manageRolesByReacting(reaction, user, 'remove')
    })
})

// First time entering a Guild
client.on('guildCreate', async function (guild) {
    // Check if a guild already exists
    const dbGuild = await controllerGuild.getOne({ guild_id: guild.id })
    if (dbGuild.code == 404) {
        // Variables
        arrayDevelopers = []

        // Push owner of guild
        arrayDevelopers.push(guild.ownerID)

        // Save Guild to database
        await controllerGuild.post({ guild_id: guild.id, developers: arrayDevelopers })
    }
})

// Leaving a guild
client.on('guildDelete', async function (guild) {
    // Variables
    const dbGuild = await controllerGuild.getOne({ guild_id: guild.id })

    // Delete dbGuild from database
    if (dbGuild.code != 404 || !'err' in dbGuild) {
        await controllerGuild.delete(dbGuild.data._id)
        echo.info(`Left Guild with ID ${dbGuild.data._id}.`)
    }
})

// Act when command is issued
client.on('message', async function (message) {
    // console.log(message.content)
    // Variables
    let voyagerRoleId = null
    if (message.guild) voyagerRoleId = helper.getVoyagerRoleId(message.guild)

    // If message is only a bot ping
    if (message.content == process.env.VOYAGER_PREFIX) return message.channel.send(`Use \`@Voyager help\` for a list of commands.`)

    // If message starts with bot prefix or Voyager role and message.author is NOT Voyager 
    if (message.author.id != process.env.VOYAGER_CLIENT_ID && (message.content.startsWith(process.env.VOYAGER_PREFIX) || message.content.startsWith(process.env.VOYAGER_PREFIX2) || message.content.startsWith(helper.getRoleAsMentionFromId(voyagerRoleId)))) {
        // Variables
        let dbGuild = null
        const args = message.content.slice(process.env.VOYAGER_PREFIX.length).trim().split(/ +/)
        let commandInput = args.shift().toLowerCase()
        // console.log(args)
        // console.log(commandInput)

        // Check if command exists (with aliases)
        const command = client.commands.get(commandInput) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandInput))
        if (!command) return

        // Check if command needs dbGuild
        if (command.needsDatabaseGuild || command.devOnly) {
            // Check if in DMs
            if (message.channel.type == 'dm') return message.channel.send(config.texts.wrongChannel)

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
                } else message.guild.owner.send(`Something has gone wrong on my side, I had to reset all settings for your Guild \`${message.guild.name} - ${message.guild.id}\`. Please set me up again! Sorry for the hassle.`)
            }
            // Found
            else {
                // Variables
                let body = {}

                // Check for role_id
                if (!dbGuild.data.role_id) body.role_id = voyagerRoleId

                // Check for developers array
                if (!dbGuild.data.developers.includes(message.guild.ownerID)) {
                    body.developers = dbGuild.data.developers
                    body.developers.push(message.guild.ownerID)
                }

                // Check for error in dbGuild
                dbGuild = await controllerGuild.put(dbGuild.data._id, body)
                if ('err' in dbGuild) {
                    echo.error(`Updating Guild. Code ${dbGuild.code}.`)
                    echo.error(dbGuild.err)
                    return message.channel.send(config.texts.generalError)
                }
            }
        }

        // Try to execute it
        try { command.execute(message, args, dbGuild) }
        catch (err) { console.log(err) }
    }
})
