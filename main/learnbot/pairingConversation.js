/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'
import asyncForEach from 'async-foreach'
import { __ } from 'i18n'

import { getBase } from '../airtable/index'
import { getPairingsNotIntroduced } from '../methods'

const {forEach} = asyncForEach

export default async (bot, message, membersPaired) => {
  const base = await getBase(bot.config.id)
  const apiUser = Promise.promisifyAll(bot.api.users)
  const apiGroups = Promise.promisifyAll(bot.api.groups)
  const airtableUpdate = Promise.promisify(base('P2PL Pairing').update)
  const botSay = Promise.promisify(bot.say)
  const token = bot.config.bot.app_token
  const {members} = await apiUser.listAsync({token})
  const list = _.map(members, member => _.pick(member, ['id', 'name']))
  const pairingsNotIntroduced = await getPairingsNotIntroduced(bot.config.id)
  forEach(pairingsNotIntroduced, async function (pairing) {
    const done = this.async()
    const teacher = _.find(list, ['name', pairing.get('Teacher')])
    const learner = _.find(list, ['name', pairing.get('Learner')])
    const indexTeacher = _.findIndex(membersPaired, e => e.name === teacher.name)
    const skill = membersPaired[indexTeacher].teaching
    const {groups} = await apiGroups.listAsync({token})
    const groupName = `p2pl_${pairing.get('Id')}`
    let group = _.find(groups, ['name', groupName])
    let groupId
    if (group) {
      groupId = group.id
      if (group.is_archived === true) await apiGroups.unarchiveAsync({token, channel: groupId})
    } else {
      const groupCreate = await apiGroups.createAsync({token, name: groupName})
      group = groupCreate.group
      groupId = groupCreate.group.id
    }

    if (_.indexOf(group.members, teacher.id) === -1) {
      await apiGroups.inviteAsync({
        token,
        channel: groupId,
        user: teacher.id
      })
    }

    if (_.indexOf(group.members, learner.id) === -1) {
      await apiGroups.inviteAsync({
        token,
        channel: groupId,
        user: learner.id
      })
    }

    await apiGroups.inviteAsync({token, channel: groupId, user: bot.identifyBot().id})
    await airtableUpdate(pairing.id, {'Introduced': true})
    await botSay({
      text: __('pairingConversation.pairing', { teacher: teacher.name, learner: learner.name, skill }),
      channel: groupId
    })
    if (learner.id !== message.user && teacher.id !== message.user) {
      await apiGroups.leaveAsync({
        token,
        channel: groupId
      })
    }
    done()
  })
}
