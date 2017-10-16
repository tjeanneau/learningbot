/**
 * Created by thomasjeanneau on 08/02/2017.
 */

import Botkit from 'botkit'
import FirebaseStorage from 'botkit-storage-firebase'
import Promise from 'bluebird'
import { __ } from 'i18n'

import { base } from '../airtable/index'
import { getSlackUser } from '../methods'
import firstTimeConversation from './firstTimeConversation'

require('dotenv').config()

const _bots = {}
const {
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  FIREBASE_URI,
  PORT,
  NODE_ENV
} = process.env

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !PORT || !FIREBASE_URI || !NODE_ENV) {
  console.log('Error: Specify SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, PORT, NODE_ENV and FIREBASE_URI in a .env file')
  process.exit(1)
}

const trackBot = (bot) => {
  _bots[bot.config.token] = bot
}

const mongoStorage = new FirebaseStorage({
  firebase_uri: FIREBASE_URI
})

const controller = Botkit.slackbot({
  debug: false,
  interactive_replies: true,
  require_delivery: true,
  storage: mongoStorage
})

controller.configureSlackApp({
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  scopes: ['bot', 'chat:write:bot', 'groups:history', 'groups:read', 'groups:write', 'users:read', 'users:read.email']
})

controller.setupWebserver(PORT, (err) => {
  if (err) return console.log(err)
  controller
    .createWebhookEndpoints(controller.webserver)
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver, (err, req, res) => {
      if (err) return res.status(500).send('ERROR: ' + err)
      res.send('Success!')
    })
})

controller.on('create_bot', async (bot, config) => {
  console.log(bot.config)
  if (_bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    const create = Promise.promisify(base('Companies').create)
    await create({
      'Name': bot.config.name,
      'Team ID': bot.config.id,
      'Created By': bot.config.createdBy,
      'Url': bot.config.url
    })
    bot.startRTM((err) => {
      if (!err) trackBot(bot)
      bot.startPrivateConversation({ user: config.createdBy }, (err, convo) => {
        if (err) return console.log(err)
        convo.say(__('config.intro'))
      })
    })
  }
})

controller.on('team_join', async function (bot, message) {
  const { name } = await getSlackUser(bot, message.user)
  await firstTimeConversation(bot, message, { name })
})

controller.on('rtm_open', () => {
  console.log('** The RTM api just connected!')
})

controller.on('rtm_close', () => {
  console.log('** The RTM api just closed')
})

controller.storage.teams.all((err, teams) => {
  if (err) throw new Error(err)
  for (let t in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM((err, bot) => {
        if (err) return console.log('Error connecting bot to Slack:', err)
        trackBot(bot)
      })
    }
  }
})

export { controller }
