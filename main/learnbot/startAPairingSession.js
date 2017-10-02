/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'
import asyncForEach from 'async-foreach'
import { __ } from 'i18n'

import { getMembersPaired } from '../methods'

const { forEach } = asyncForEach

export default async (bot) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const { members } = await apiUser.listAsync({ token: bot.config.bot.app_token })
  const botSay = Promise.promisify(bot.say)
  const list = _.map(members, member => _.pick(member, ['id', 'name']))
  const membersPaired = await getMembersPaired(bot.config.id)
  forEach(membersPaired, async function (member) {
    const done = this.async()
    const { name, isLearner, teacherName, learning, isTeacher, learnerName, teaching } = member
    const channel = _.find(list, ['name', name]).id
    if (isLearner === true && isTeacher === false) {
      await botSay({
        text: __('startAPairingSession.message1', { teacher: teacherName, learning }),
        channel
      })
    } else if (isLearner === true && isTeacher === true) {
      await botSay({
        text: __('startAPairingSession.message2', { teacher: teacherName, learner: learnerName, learning, teaching }),
        channel
      })
    } else if (isLearner === false && isTeacher === true) {
      await botSay({
        text: __('startAPairingSession.message3', { learner: learnerName, teaching }),
        channel
      })
    } else {
      await botSay({
        text: __('startAPairingSession.message4'),
        channel
      })
    }
    done()
  })
  return membersPaired
}
