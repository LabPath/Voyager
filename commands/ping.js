// Require: Libs
const embeds = require('../lib/embeds')

// Exports
module.exports = {
    name: 'ping',
    alternatives: ['pang'],
    execute(message, args) {
        message.channel.send(embeds.simpleFooter('3e8ed4', 'Pong.', 'This is an example embed with "Pong" set as the title.'))
    }
}
