// Require: Files
const User = require('./model')

// Get
exports.get = function (filters) {
    return User
        .find(filters)
        .exec()
        .then(function (users) {
            if (users.length == 0) return { data: users, code: 404 }
            else return { data: users, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get One
exports.getOne = function (filters) {
    return User
        .findOne(filters)
        .exec()
        .then(function (user) {
            if (user == null) return { data: user, code: 404 }
            else return { data: user, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get by ID
exports.getById = function (id) {
    return User
        .findById(id)
        .exec()
        .then(function (user) {
            if (user == null) return { data: user, code: 404 }
            else return { data: user, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Post
exports.post = function (body) {
    return new User(body)
        .save()
        .then(function (user) { return { data: user, code: 201 } })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Put
exports.put = function (id, body) {
    return User
        .findByIdAndUpdate(id, body, { new: true })
        .exec()
        .then(function (user) {
            if (user == null) return { data: user, code: 404 }
            else return { data: user, code: 201 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Delete
exports.delete = function (id) {
    return User
        .findByIdAndDelete(id)
        .exec()
        .then(function (user) {
            if (user == null) return { data: user, code: 404 }
            else return { data: user, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}
