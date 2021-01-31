// Require: Packages
const mongoose = require('mongoose')

// Model: Nouns
const Guild = mongoose.model('Guilds', new mongoose.Schema({
    guild_id: {type: String, require: true},
    role_id: String,
    developers: Array,
    roles: {
        visual_guides: String,
        arcane_labyrinth: String,
        dismal_maze: String,
        redemption_codes: String,
        map_guides: String
    },
    channels: {
        reddit: String
    }
}))

// Exports
module.exports = Guild
