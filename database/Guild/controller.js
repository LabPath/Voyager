// Require: Files
const Guild = require('./model')

// Get
exports.get = function (filters) {
    return Guild
        .find(filters)
        .exec()
        .then(function (guilds) {
            if (guilds.length == 0) return { data: guilds, code: 404 }
            else return { data: guilds, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get One
exports.getOne = function (filters) {
    return Guild
        .findOne(filters)
        .exec()
        .then(function (guild) {
            if (guild == null) return { data: guild, code: 404 }
            else return { data: guild, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get by ID
exports.getById = function (id) {
    return Guild
        .findById(id)
        .exec()
        .then(function (guild) {
            if (guild == null) return { data: guild, code: 404 }
            else return { data: guild, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Post
exports.post = function (body) {
    return new Guild(body)
        .save()
        .then(function (guild) { return { data: guild, code: 201 } })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Put
exports.put = function (id, body) {
    return Guild
        .findByIdAndUpdate(id, body, { new: true })
        .exec()
        .then(function (guild) {
            if (guild == null) return { data: guild, code: 404 }
            else return { data: guild, code: 201 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Delete
exports.delete = function (id) {
    return Guild
        .findByIdAndDelete(id)
        .exec()
        .then(function (guild) {
            if (guild == null) return { data: guild, code: 404 }
            else return { data: guild, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}
