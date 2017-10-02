/**
 * Created by thomasjeanneau on 09/04/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'
import asyncForEach from 'async-foreach'
import { __ } from 'i18n'

import {
  checkIfAdmin,
  getMember,
  getAllApplicants,
  getAllNoApplicants,
  updateApplicant,
  getApplicant,
  getSlackUser,
  checkIfFirstTime
} from '../methods'
import { pairAllApplicants } from './pairing'
import { controller } from './config'
import { base, _getAllRecords } from '../airtable/index'

import pairingConversation from './pairingConversation'
import startAPairingSession from './startAPairingSession'
import firstTimeConversation from './firstTimeConversation'

require('dotenv').config()

const { forEach } = asyncForEach
const { NODE_ENV } = process.env

if (!NODE_ENV) {
  console.log('Error: Specify in a .env file')
  process.exit(1)
}

// Admin Commands

controller.hears('^pair all applicants$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const isAdmin = await checkIfAdmin(bot, message)
    if (isAdmin) {
      const botReply = Promise.promisify(bot.reply)
      await botReply(message, __('hears.pairAllApplicants1'))
      const pairing = await pairAllApplicants(bot.config.id)
      await botReply(message, __('hears.pairAllApplicants2', { length: pairing.pairs.length }))
    } else {
      bot.reply(message, __('hears.notAdmin'))
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('^introduce new pairings$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const isAdmin = await checkIfAdmin(bot, message)
    if (isAdmin) {
      const botReply = Promise.promisify(bot.reply)
      await botReply(message, __('hears.introduceNewPairing1'))
      const membersPaired = await startAPairingSession(bot, message)
      await pairingConversation(bot, message, membersPaired)
      await botReply(message, __('hears.introduceNewPairing2'))
    } else {
      bot.reply(message, __('hears.notAdmin'))
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('^send presentation message to no-applicants$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const isAdmin = await checkIfAdmin(bot, message)
    if (isAdmin) {
      const botReply = Promise.promisify(bot.reply)
      await botReply(message, __('hears.presentationMessage1'))
      const noApplicants = await getAllNoApplicants(bot)
      forEach(noApplicants, async function ({ id, name }) {
        const done = this.async()
        if (NODE_ENV === 'PRODUCTION') {
          const records = await _getAllRecords(base('Companies').select({
            view: 'Main view',
            filterByFormula: `{Team ID} = '${bot.config.id}'`
          }))
          const formId = records[0].fields['Learnbot Form ID']
          firstTimeConversation(bot, { user: id }, { name, formId })
        } else {
          console.log('Send to', name)
        }
        done()
      })
      await botReply(message, __('hears.presentationMessage2'))
    } else {
      bot.reply(message, __('hears.notAdmin'))
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

// Applicants Commands

controller.hears(['^Hello$', '^Yo$', '^Hey$', '^Hi$', '^Ouch$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const { name } = await getSlackUser(bot, message.user)
    bot.startConversation(message, function (err, convo) {
      if (err) return console.log(err)
      convo.say(__('hears.hello1', { name }))
      convo.say(__('hears.hello2'))
      convo.say(__('hears.hello3'))
    })
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('^start$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    bot.reply(message, __('hears.start'))
    const { name } = await getSlackUser(bot, message.user)
    await updateApplicant(bot.config.id, name, { 'Inactive': false })
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('^stop$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    bot.startConversation(message, function (err, convo) {
      if (err) return console.log(err)
      convo.say(__('hears.stop1'))
      convo.say(__('hears.stop2'))
    })
    const { name } = await getSlackUser(bot, message.user)
    await updateApplicant(bot.config.id, name, { 'Inactive': true })
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('^show profile$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const { name } = await getSlackUser(bot, message.user)
    const rec = await getApplicant(bot.config.id, name)
    const { fields } = await getMember(bot.config.id, rec.get('Applicant')[0])
    const isInactive = rec.get('Inactive') === true
    bot.reply(message, {
      'text': __('hears.showProfile1', { id: message.user, name }),
      'attachments': [
        {
          'title': isInactive ?  __('hears.showProfile2') : __('hears.showProfile3'),
          'text': isInactive ? __('hears.showProfile4') : __('hears.showProfile5'),
          'color': isInactive ? '#E0E0E0' : '#81C784',
          'thumb_url': fields['Profile Picture'] ? fields['Profile Picture'][0].url : null
        },
        {
          'title': __('hears.showProfile6'),
          'text': rec.get('Interests').join(', '),
          'color': '#64B5F6'
        },
        {
          'title': __('hears.showProfile7'),
          'text': rec.get('Skills').join(', '),
          'color': '#E57373'
        }
      ]
    })
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('^show all applicants$', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const botReply = Promise.promisify(bot.reply)
    const apiUser = Promise.promisifyAll(bot.api.users)
    await botReply(message, __('hears.showAllApplicant1'))
    const people = await getAllApplicants(bot.config.id)
    const { members } = await apiUser.listAsync({ token: bot.config.bot.app_token })
    const attachments = []
    forEach(people, async function (person) {
      const done = this.async()
      const { fields } = await getMember(bot.config.id, person.applicant)
      const { id } = _.find(members, (m) => m.name === person.name)
      attachments.push({
        'title': __('hears.showAllApplicant2', { name: person.name, id }),
        'color': '#E57373',
        'thumb_url': fields['Profile Picture'] ? fields['Profile Picture'][0].url : null,
        'fields': [
          {
            'title': __('hears.showAllApplicant3'),
            'value': person.interests.join(', '),
            'short': false
          },
          {
            'title': __('hears.showAllApplicant4'),
            'value': person.skills.join(', '),
            'short': false
          }
        ]
      })
      done()
    }, async () => {
      await botReply(message, {
        'text': __('hears.showAllApplicant5', { length: people.length })
      })
      forEach(attachments, async function (attachment) {
        const done = this.async()
        await botReply(message, {
          'attachments': [attachment]
        })
        done()
      })
    })
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears(['^help$', '^options$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const { name } = await getSlackUser(bot, message.user)
    const botReply = Promise.promisify(bot.reply)
    await botReply(message, __('hears.help1', { name }))
    await botReply(message, {
      attachments: [{
        pretext: __('hears.help2'),
        text: __('hears.help3'),
        mrkdwn_in: ['text', 'pretext']
      }]
    })
    const isAdmin = await checkIfAdmin(bot, message)
    if (isAdmin) {
      await botReply(message, {
        attachments: [{
          pretext: __('hears.help4'),
          text: __('hears.help5'),
          mrkdwn_in: ['text', 'pretext']
        }]
      })
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

controller.hears('[^\n]+', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    if (await checkIfFirstTime(bot, message) === false) return
    const { name } = await getSlackUser(bot, message.user)
    bot.startConversation(message, function (err, convo) {
      if (err) return console.log(err)
      convo.say(__('hears.default1', { name }))
      convo.say(__('hears.default2'))
    })
  } catch (e) {
    console.log(e)
    bot.reply(message, __('hears.error', { error: e.message || e.error || e }))
  }
})

