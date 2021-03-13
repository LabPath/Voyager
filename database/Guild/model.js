// Require: Packages
const mongoose = require('mongoose')

// Model
const Guild = mongoose.model('Guilds', new mongoose.Schema({
    guild_id: { type: String, require: true },
    role_id: String,
    message_reaction_id: String,
    developers: Array,
    trusted: Array,
    roles: Array, // Entries for this are inside the config.json file (commands.set.roles) // TODO: Change this to an object
    channels: Object // Entries for this are inside the config.json file (commands.set.channels)
}))

// Exports
module.exports = Guild
