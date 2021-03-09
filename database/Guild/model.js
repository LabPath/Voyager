// Require: Packages
const mongoose = require('mongoose')

// Model
const Guild = mongoose.model('Guilds', new mongoose.Schema({
    guild_id: { type: String, require: true },
    role_id: String,
    message_reaction_id: String,
    developers: Array,
    roles: Array, // Entries for this are inside the config.json file (commands.set.roles)
    channels: { // TODO: Don't make this hardcoded. Channels should simply be an array
        reddit: String,
        roles: String
    }
}))

// Exports
module.exports = Guild
