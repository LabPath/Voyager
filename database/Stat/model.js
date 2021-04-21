// Require: Packages
const mongoose = require('mongoose')

// Model
const Stat = mongoose.model('Stats', new mongoose.Schema({
    redemption_codes: {
        totalAttempts: { type: Number, default: 0 },
        totalRedeemed: { type: Number, default: 0 }
    }
}))

// Exports
module.exports = Stat
