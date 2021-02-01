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

// Login with Token
client.login(process.env.VOYAGER_TOKEN)

// Start bot
client.once('ready', async function () {
    echo.success('Voyager up and running!')
    echo.info('Running version ' + package.version)

    // Run a subreddit check every 30 mins
    setInterval(() => { helper.checkSubreddits(client) }, config.reddit.lab_path.checkInterval)
})

// First time entering a Guild
client.on('guildCreate', async function (guild) {
    // Variables
    arrayDevelopers = []

    // Push owner of guild
    arrayDevelopers.push(guild.ownerID)

    // Save Guild to database
    await controllerGuild.post({ guild_id: guild.id, developers: arrayDevelopers })
})

// Leaving a guild
client.on('guildDelete', async function (guild) {
    // Variables
    const dbGuild = await controllerGuild.getOne({ guild_id: guild.id })

    // Remove guild from Database
    if (dbGuild.code != 404 || !'err' in dbGuild) {
        await controllerGuild.delete(dbGuild.data._id)
        echo.info(`Left Guild with ID ${dbGuild.data._id}.`)
    }
})

// Act when command is issued
client.on('message', async function (message) {
    // console.log(message.content)
    // Variables
    const voyagerRoleId = message.guild.roles.cache.find(role => role.name == "Voyager" && role.managed == true).id

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
