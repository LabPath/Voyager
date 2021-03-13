// Require: Packages
const axios = require('axios')
const axiosCookieJarSupport = require('axios-cookiejar-support').default

// Set Cookie Jar
axiosCookieJarSupport(axios)

// Default axios config
axios.defaults.withCredentials = true

// Get
exports.get = async function (url, options) {
    // console.log('GET', options)
    return await axios.get(url, options)
        .then(async function (res) { /* console.log(axios.options); */ return res })
        .catch(function (err) { console.log(err) })
}

// Post
exports.post = async function (url, body, options) {
    // console.log('POST', options)
    return await axios.post(url, body, options)
        .then(async function (res) { /* console.log(cookieJar); */ return res })
        .catch(function (err) { console.log(err) })
}
