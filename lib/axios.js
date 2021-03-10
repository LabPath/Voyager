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
        .then(async function (res) { const config = res.config; /*console.log(config.jar.toJSON());*/ return res })
        .catch(function (err) { console.log(err) })
}

// Post
exports.post = async function (url, body, options) {
    return await axios.post(url, body, options)
        .then(async function (res) { const config = res.config; /*console.log(config.jar.toJSON());*/ return res })
        .catch(function (err) { console.log(err) })
}

// Get latest subreddit posts
exports.getLatestSubredditPosts = async function () {
    return await axios.get('http://www.reddit.com/r/lab_path/new.json?limit=5')
        .then(async function (res) {
            // Variables
            let redditPosts = { dismal: null, arcane: null }

            // Populate redditPosts
            for (i of res.data.data.children) {
                // Dismal
                if (i.data.link_flair_richtext[1].t.trim() == 'Dismal Maze' && !redditPosts.dismal) {
                    redditPosts.dismal = {
                        id: i.data.id,
                        author: i.data.author,
                        title: i.data.title,
                        url: i.data.permalink,
                        imgUrl: i.data.url,
                        flairText: i.data.link_flair_richtext[1].t.trim(),
                        hasBeenPosted: false
                    }
                }
                // Arcane
                else if (i.data.link_flair_richtext[1].t.trim() == 'Arcane Labyrinth' && !redditPosts.arcane) {
                    redditPosts.arcane = {
                        id: i.data.id,
                        author: i.data.author,
                        title: i.data.title,
                        url: i.data.permalink,
                        imgUrl: i.data.url,
                        flairText: i.data.link_flair_richtext[1].t.trim(),
                        hasBeenPosted: false
                    }
                }

                // Break if both are filled already
                if (redditPosts.dismal && redditPosts.arcane) break
            }

            // Return
            return redditPosts
        }).catch(function (err) { console.log(err) })
}
