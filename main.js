// Require: Packages
require('dotenv').config()
const discord = require('discord.js')
const fs = require("fs")

// Require: Files
const config = require('./config.json')
const package = require('./package.json')

// Require: Lib
const helper = require('./lib/helper')
const echo = require('./lib/echo')

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
client.once('ready', function () {
    echo.success('Voyager up and running!')
    echo.info('Running version ' + package.version)
})

// Act when command is issued
client.on('message', async function (message) {
    // console.log(message.content)

    // If message is only a bot ping
    if (message.content == config.voyager.prefix) return message.channel.send(`Use \`@Voyager help\` for a list of commands.`)

    // If message starts with bot prefix and message.author is NOT Voyager 
    if (message.content.startsWith(config.voyager.prefix) && message.author.id != config.voyager.client_id) {
        // Variables
        const args = message.content.slice(config.voyager.prefix.length).trim().split(/ +/)
        let command = args.shift().toLowerCase()
        // console.log(args)
        // console.log(command)

        // If command exists
        if (client.commands.has(command)) {
            // Try to execute it
            try { client.commands.get(command).execute(message, args) }
            catch (err) { echo.error(err) }
        }
        // Check for alternatives
        else {
            for (i in alternatives) {
                if (alternatives[i].includes(command)) {
                    // Try to execute it
                    try { client.commands.get(i).execute(message, args) }
                    catch (err) { echo.error(err) }
                    break
                }
            }
        }
    }
})
