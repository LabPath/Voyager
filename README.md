# Voyager <!-- omit in toc -->
Custom made Discord bot designed to help the Lab Path community.
<!-- [Invite me!](https://discord.com/oauth2/authorize?client_id=804537849747734578&scope=bot&permissions=8) -->

# Table of contents <!-- omit in toc --> 
- [Commands](#commands)
- [Set-up](#set-up)
- [`.env`](#env)
- [Directories](#directories)
- [Creating new commands](#creating-new-commands)
- [Embeds](#embeds)

# Commands
In order to use a command, you'll need to type the prefix of the bot and then the command. For example: `@Voyager ping`

| Command | Description    |
| :-----: | :------------- |
| `ping`  | Pings the bot. |

# Set-up
1. Clone this repository.
2. Run `npm i` in terminal to install dependencies.
3. Create `.env` file at root directory (same level as `package.json`). Check [`.env`](#env) for more info.
4. Run `npm run dev` to start the bot.
5. Use `Ctrl + C` to stop the bot.

# `.env`
The environment file has various variables that Voyager uses:

|    Variable     | Description                                                                                                           |
| :-------------: | :-------------------------------------------------------------------------------------------------------------------- |
| `VOYAGER_TOKEN` | The Token given by Discord. You can get it [here](https://discord.com/developers/applications/804537849747734578/bot) |

Example `.env` file:
```
VOYAGER_TOKEN=KLJAGN876WQ34M98UWSEF9O7J8WYM3RMY8O9SHEF
```

# Directories
Voyager has various directories, each with their respective purpose:

|   Directory    | Description                                                                                                                                             |
| :------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   `commands`   | A collection of `.js` files that each represent one command.                                                                                            |
|     `lib`      | A collection of `.js` files whose purpose is to have functions available to main files. These files will always export a function that returns a value. |
|    `utils`     | A folder with folders for any type of files without code.                                                                                               |
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

The best way to use them, is to call the `lib/embeds.js` file and use its functions to generate an embed.

If you want a very specific embed, and think it's not worth to create a function for it, here's a quick snippet to create one:
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
