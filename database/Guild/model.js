// Require: Packages
const mongoose = require('mongoose')

// Model: Nouns
const Guild = mongoose.model('Guilds', new mongoose.Schema({
    guild_id: {type: String, require: true},
    developers: []
}))

// Exports
module.exports = Guild
