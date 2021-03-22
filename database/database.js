// Require: Packages
const mongoose = require('mongoose')

// Require: Libs
const echo = require('../lib/echo')

// TODO: Update all controllers for PUT and DELETE to use findOneAndACTION instead of findByIdAndACTION

// Fix mongoose deprecate warnings (https://mongoosejs.com/docs/deprecations.html)
mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)

// Connect
if (process.env.VOYAGER_DB_USER && process.env.VOYAGER_DB_PASSWORD && process.env.VOYAGER_DB_NAME)
    mongoose.connect(`mongodb+srv://${process.env.VOYAGER_DB_USER}:${process.env.VOYAGER_DB_PASSWORD}@main.c8dm9.mongodb.net/${process.env.VOYAGER_DB_NAME}?retryWrites=true&w=majority`)
else echo.warn('.env file does not have all the necessary info to connect to the database! Not connected.')

// On error
mongoose.connection.on('error', function (err) { echo.error(err) })

// Once open
mongoose.connection.once('open', function () { echo.success('Connected to DB.') })
