# Voyager <!-- omit in toc -->
Custom made Discord bot designed to help the Lab Path community.
<!-- [Invite me!](https://discord.com/oauth2/authorize?client_id=804537849747734578&scope=bot&permissions=8) -->

# Table of contents <!-- omit in toc --> 
- [Set-up](#set-up)
- [Development](#development)
- [Documentation](#documentation)
- [Commands](#commands)
- [`.env`](#env)
- [Directories](#directories)
- [Creating new commands](#creating-new-commands)
- [Embeds](#embeds)
- [Database](#database)

# Set-up
1. Clone this repository.
2. Run `npm i` in terminal to install dependencies.
3. Create `.env` file at root directory (same level as `package.json`). Check [`.env`](#env) for more info.
4. Run `npm run dev` to start the bot.
5. Use `Ctrl + C` to stop the bot.

# Development
Do not commit directly to `master`, please create a Branch first (with a suggestive name based on your changes) and then ask for a merge.

# Documentation
* [Discord Developer portal](https://discord.com/developers/applications/804537849747734578/bot)
* [discord.js docs](https://discord.js.org/#/docs/main/stable/general/welcome)
* [Discord JS Guides](https://discordjs.guide/)

# Commands
In order to use a command, you'll need to type the prefix of the bot and then the command. For example: `@Voyager ping`

| Command | Description    |
| :-----: | :------------- |
| `ping`  | Pings the bot. |

# `.env`
The environment file has various variables that Voyager uses:

|    Variable     | Description                                                                                                            |
| :-------------: | :--------------------------------------------------------------------------------------------------------------------- |
| `VOYAGER_TOKEN` | The Token given by Discord. You can get it [here](https://discord.com/developers/applications/804537849747734578/bot). |
|    `DB_USER`    | Database user name.                                                                                                    |
|  `DB_PASSWORD`  | Database password.                                                                                                     |
|    `DB_NAME`    | Database name.                                                                                                         |

Example `.env` file:
```
VOYAGER_TOKEN=KLJAGN876WQ34M98UWSEF9O7J8WYM3RMY8O9SHEF
DB_USER=db_username
DB_PASSWORD=db_password
DB_NAME=db_name
```

# Directories
Voyager has various directories, each with their respective purpose:

|   Directory    | Description                                                                                                                                             |
| :------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   `commands`   | A collection of `.js` files that each represent one command.                                                                                            |
|   `database`   | A collection of folders and `.js` files that are anything database related.                                                                             |
|     `lib`      | A collection of `.js` files whose purpose is to have functions available to main files. These files will always export a function that returns a value. |
|    `utils`     | A folder with folders for any type of files without **code**.                                                                                           |
| `utils/assets` | A collection of images used throughout the project.                                                                                                     |

# Creating new commands
It's actually pretty simple which is cool. Create a new file with the name of the command inside the `commands` folder. Paste the following code inside:
```js
// Exports
module.exports = {
    name: 'commandName',
    alternatives: ['alternative1', 'alternative2'],
    execute(message, args) {
		// Your code here
        // Can also be async code. Just put "async" before "execute(message, args)"
    }
}
```

What do the `execute()` arguments mean?
* `message`: The whole message object discord.js offers. Pretty cool if you ask me.
* `args`: Any type of arguments sent along with the command. Ex: `!ping haha hehe => ['haha', 'hehe']`

If you're unsure, a simple `console.log(message)` and `console.log(args)` will most likely help you!

# Embeds
Embeds are arguably the prettiest things on Discord. Let's use them! 

The best way to use them, is to call the `lib/embeds.js` file and use its functions to generate an embed. If you want a very specific embed, and think it's not worth to create a function for it, here's a quick snippet to create one:
```js
// Require: Packages
const discord = require('discord.js');

// Embed
const exampleEmbed = new discord.MessageEmbed()
	.setColor('#0099ff') // Hex color for the stripe on the side
	.setTitle('Some title') // Title of the embed
	.setDescription('Some description here') // Main message
	.setURL('https://discord.js.org/') // Small image in the top right corner
	.setThumbnail('https://i.imgur.com/wSTFkRM.png') // Big picture in the bottom
	.addFields(
		{ name: 'Regular field title', value: 'Some value here' },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
	)
	.addField('Inline field title', 'Some value here', true) // Inline filed
	.setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png') // Footer text
	.setImage('https://i.imgur.com/wSTFkRM.png') // Footer image

// Send embed
message.channel.send(exampleEmbed)
```

# Database
Voyager uses MongoDB as its database of choice, which is hosted at mongoDB atlas (AWS in this case). There's a **max of 500MB** free usable space. Anything related to the database should be inside the `database` folder. If you're a developer and want to have access to the DB through the Web (using Atlas), please create an account [here](https://account.mongodb.com/account/register) and ask @Zebiano for an invite.
