// Requires: Packages
const chalk = require('chalk')

// Info
exports.info = function (msg, exit) {
    console.log(chalk.blue.bold('Info: ') + msg)
    if (exit) process.exit()
}

// Success
exports.success = function (msg, exit) {
    console.log(chalk.green.bold('Success: ') + msg)
    if (exit) process.exit()
}

// Tip
exports.tip = function (msg, exit) {
    console.log(chalk.green.bold('Tip: ') + msg)
    if (exit) process.exit()
}

// Warn
exports.warn = function (msg, exit) {
    console.log(chalk.yellow.bold('Warn: ') + msg)
    if (exit) process.exit()
}

// Error
exports.error = function (msg, exit) {
    console.log(chalk.red.bold('Error: ') + msg)
    if (exit) process.exit()
}
