// Require: Packages
const mongoose = require('mongoose')

// Model
const Code = mongoose.model('Codes', new mongoose.Schema({
    code: { type: String, required: true },
    expiration_date: { type: String, default: 'Unknown/Never' },
    rewards: Array
}))

// Exports
module.exports = Code
