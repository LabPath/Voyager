// Require: Files
const Code = require('./model')

// Get
exports.get = function (filters) {
    return Code
        .find(filters)
        .exec()
        .then(function (codes) {
            if (codes.length == 0) return { data: codes, code: 404 }
            else return { data: codes, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get One
exports.getOne = function (filters) {
    return Code
        .findOne(filters)
        .exec()
        .then(function (code) {
            if (code == null) return { data: code, code: 404 }
            else return { data: code, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Get by ID
exports.getById = function (id) {
    return Code
        .findById(id)
        .exec()
        .then(function (code) {
            if (code == null) return { data: code, code: 404 }
            else return { data: code, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Post
exports.post = function (body) {
    return new Code(body)
        .save()
        .then(function (code) { return { data: code, code: 201 } })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Put
exports.put = function (id, body) {
    return Code
        .findByIdAndUpdate(id, body, { new: true })
        .exec()
        .then(function (code) {
            if (code == null) return { data: code, code: 404 }
            else return { data: code, code: 201 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}

// Delete
exports.delete = function (filters) {
    return Code
        .findOneAndDelete(filters)
        .exec()
        .then(function (code) {
            if (code == null) return { data: code, code: 404 }
            else return { data: code, code: 200 }
        })
        .catch(function (err) {
            console.log(err)
            return { err: err, code: 500 }
        })
}
