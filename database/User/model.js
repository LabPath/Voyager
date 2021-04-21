// Require: Packages
const mongoose = require('mongoose')

// Model
const User = mongoose.model('Users', new mongoose.Schema({
    discord_id: { type: String },
    afk: {
        afk_uids: { type: Array, require: true },
        notify: { type: Boolean, default: false}
    }
}))

// Exports
module.exports = User
