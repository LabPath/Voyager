// Require: Packages
const axios = require('axios')
const tough = require('tough-cookie')
const axiosCookieJarSupport = require('axios-cookiejar-support').default

// Set Cookie Jar
axiosCookieJarSupport(axios)

// Variables
const cookieJar = new tough.CookieJar()

// Default axios config
axios.defaults.jar = cookieJar
axios.defaults.withCredentials = true

// Get
exports.get = async function (url, options) {
    return await axios.get(url, options)
        .then(async function (res) { return res })
        .catch(function (err) { console.log(err) })
}

// Post
exports.post = async function (url, body, options) {
    return await axios.post(url, body, options)
        .then(async function (res) { return res })
        .catch(function (err) { console.log(err) })
}
