/**
 * Created by thomasjeanneau on 08/02/2017.
 */

import Botkit from 'mangrove-botkit'
import BotkitStorageMongo from 'botkit-storage-mongo'

import { base } from '../airtable/index'

const _bots = {}
const {
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  MONGODB_URI,
} = process.env

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !MONGODB_URI) {
  console.log('Error: Specify SLACK_CLIENT_ID, SLACK_CLIENT_SECRET and MONGODB_URI in a .env file')
  process.exit(1)
}

const trackBot = (bot) => {
  _bots[bot.config.token] = bot
}

const mongoStorage = new BotkitStorageMongo({
  mongoUri: MONGODB_URI
})

const controller = Botkit.slackbot({
  debug: false,
  interactive_replies: true,
  require_delivery: true,
  storage: mongoStorage,
  app_name: 'learnbot'
})

controller.configureSlackApp({
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  scopes: ['bot', 'chat:write:bot', 'groups:history', 'groups:read', 'groups:write', 'users:read', 'users:read.email']
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
      bot.startPrivateConversation({user: config.createdBy}, (err, convo) => {
        if (err) return console.log(err)
        convo.say('Hey! I am the <@learnbot> that has just joined your team :smile:')
      })
    })
  }
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
