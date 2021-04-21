// Require: Files
const Stat = require('./model')

// Get
exports.get = function (filters) {
    return Stat
        .find(filters)
        .exec()
        .then(function (stats) {
            if (stats.length == 0) return { data: stats, code: 404 }
            else return { data: stats, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, stat: 500 }
        })
}

// Get One
exports.getOne = function (filters) {
    return Stat
        .findOne(filters)
        .exec()
        .then(function (stat) {
            if (stat == null) return { data: stat, code: 404 }
            else return { data: stat, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get by ID
exports.getById = function (id) {
    return Stat
        .findById(id)
        .exec()
        .then(function (stat) {
            if (stat == null) return { data: stat, code: 404 }
            else return { data: stat, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Post
exports.post = function (body) {
    return new Stat(body)
        .save()
        .then(function (stat) { return { data: stat, code: 201 } })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Put
exports.put = function (id, body) {
    return Stat
        .findByIdAndUpdate(id, body, { new: true })
        .exec()
        .then(function (stat) {
            if (stat == null) return { data: stat, code: 404 }
            else return { data: stat, code: 201 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Delete
exports.delete = function (filters) {
    return Stat
        .findOneAndDelete(filters)
        .exec()
        .then(function (stat) {
            if (stat == null) return { data: stat, code: 404 }
            else return { data: stat, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}
