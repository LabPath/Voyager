// Requires: Packages
const chalk = require('chalk')

// Info
exports.info = function (msg) {
    console.log(chalk.blue.bold('Info: ') + msg)
}

// Success
exports.success = function (msg) {
    console.log(chalk.green.bold('Success: ') + msg)
}

// Tip
exports.error = function (msg) {
    console.log(chalk.green.bold('Tip: ') + msg)
}

// Warn
exports.error = function (msg) {
    console.log(chalk.yellow.bold('Warn: ') + msg)
}

// Error
exports.error = function (msg) {
    console.log(chalk.red.bold('Error: ') + msg)
}
