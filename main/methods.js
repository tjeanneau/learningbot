/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'

import { base, getBase, _getAllRecords } from './airtable/index'
import firstTimeConversation from './learnbot/firstTimeConversation'

// get slack user info by id
export const getSlackUser = async (bot, id) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {user} = await apiUser.infoAsync({user: id})
  return user
}

// get member by id
export const getMember = async (teamId, id) => {
  const base = await getBase(teamId)
  const findMember = Promise.promisify(base('Users').find)
  const member = await findMember(id)
  return member
}

// get applicant with slack handle
export const getApplicant = async (teamId, slackHandle) => {
  const base = await getBase(teamId)
  const applicant = await _getAllRecords(base('P2PL Applicants').select({
    maxRecords: 1,
    filterByFormula: `{Slack Handle}='@${slackHandle}'`
  }))
  return applicant[0]
}

// update applicant with slack handle
export const updateApplicant = async (teamId, slackHandle, obj) => {
  const base = await getBase(teamId)
  const update = Promise.promisify(base('P2PL Applicants').update)
  const {id} = await getApplicant(teamId, slackHandle)
  const applicant = update(id, obj)
  return applicant
}

/* reads all applicants from Airtable, and returns them as an Array of
 {name: String,
 interests: [String],
 skills: [String]}
 */
export const getAllApplicants = async (teamId) => {
  const base = await getBase(teamId)
  const records = await _getAllRecords(base('P2PL Applicants').select({
    view: 'Grid view',
    fields: ['Slack handle', 'Interests', 'Skills', 'Admin', 'Applicant'],
    filterByFormula: '{Inactive}=0'
  }))
  return _.reduce(records, (people, r) => {
    const name = (r.get('Slack handle') || [])[0]
    if (name && name.length) {
      people.push({
        name: name.replace(/^@/, ''),
        interests: (r.get('Interests') || []),
        skills: (r.get('Skills') || []),
        isAdmin: !!r.get('Admin'),
        applicant: (r.get('Applicant') || [])[0]
      })
    }
    return people
  }, [])
}

/* reads all members from Slack, and returns them as an Array of
 {name: String,
 id: String}
 */
export const getAllNoApplicants = async (bot) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {members} = await apiUser.listAsync({token: bot.config.bot.app_token})
  const applicants = await getAllApplicants(bot.config.id)
  const listMember = _.map(members, ({id, name}) => ({id, name}))
  const listApplicants = _.map(applicants, ({name}) => name)
  _.remove(listMember, ({name}) => listApplicants.indexOf(name) >= 0)
  return listMember
}

export const checkIfFirstTime = async (bot, message) => {
  const {name} = await getSlackUser(bot, message.user)
  const applicant = await getApplicant(bot.config.id, name)
  if (!!applicant === false) {
    const records = await _getAllRecords(base('Companies').select({
      view: 'Main view',
      filterByFormula: `{Team ID} = '${bot.config.id}'`
    }))
    const formId = records[0].fields['Learnbot Form ID']
    await firstTimeConversation(bot, message, {name, formId})
  }
  return !!applicant
}

// reads all admins applicants from Airtable, and returns
// a boolean checking if the current user is an admin or not.
export const checkIfAdmin = async (bot, message) => {
  const admins = []
  const base = await getBase(bot.config.id)
  const apiUser = Promise.promisifyAll(bot.api.users)
  const records = await _getAllRecords(base('P2PL Applicants').select({
    view: 'Grid view',
    filterByFormula: '{Admin}=1'
  }))
  records.forEach((record) => {
    const name = record.get('Slack handle')[0]
    admins.push(name.replace(/^@/, ''))
  })
  const {user: {name}} = await apiUser.infoAsync({user: message.user})
  return admins.indexOf(name) >= 0
}

/* reads all pairing from Airtable, and returns them as an Array of
 {name: String,
 isLearner: Boolean,
 teacherName: String,
 learning: String,
 isTeacher: Boolean,
 learnerName: String,
 teaching: String}
 */
export const getMembersPaired = async (teamId) => {
  const applicants = await getAllApplicants(teamId)
  const members = _.map(applicants, ({name}) => ({name, isLearner: false, isTeacher: false}))
  const pairings = await getPairingsNotIntroduced(teamId)
  pairings.forEach((record) => {
    const learner = record.get('Learner')
    const teacher = record.get('Teacher')
    const skills = record.get('Skill')
    const index = _.random(skills.length - 1)
    const skill = skills[index]
    const indexLearner = _.findIndex(members, e => e.name === learner)
    const indexTeacher = _.findIndex(members, e => e.name === teacher)
    members[indexLearner].isLearner = true
    members[indexLearner].teacherName = teacher
    members[indexLearner].learning = skill
    members[indexTeacher].isTeacher = true
    members[indexTeacher].learnerName = learner
    members[indexTeacher].teaching = skill
  })
  return members
}

export const getPairingsNotIntroduced = async (teamId) => {
  const base = await getBase(teamId)
  const pairings = await _getAllRecords(base('P2PL Pairing').select({
    view: 'Grid view',
    filterByFormula: '{Introduced}=0'
  }))
  return pairings
}

// reads a Pairing from Airtable
export const getPairing = async (teamId, tableName, pairingId) => {
  const base = await getBase(teamId)
  const pairingRecords = await _getAllRecords(base(tableName).select({
    view: 'Grid view',
    fields: ['Teacher', 'Learner', 'Skill', 'Paired On'],
    filterByFormula: `{Pairing Id}='${pairingId}'`
  }))
  let createdAt = pairingRecords.length && pairingRecords[0].get('Paired On')
  return {
    id: pairingId,
    createdAt: createdAt && createdAt + 'T00:00:00Z',
    pairs: _.map(pairingRecords, (r) => {
      return {
        teacherName: r.get('Teacher'),
        learnerName: r.get('Learner'),
        skills: r.get('Skill')
      }
    })
  }
}

// saves a Pairing to Airtable
export const savePairing = async (teamId, tableName, pairing) => {
  const base = await getBase(teamId)
  // ensure we have the proper structure
  if (!pairing.id) return console.log('missing pairing.id')
  if (!_.isArray(pairing.pairs)) return console.log('invalid pairing.pairs')
  // write the pairs to Airtable
  const create = Promise.promisify(base(tableName).create)
  await Promise.map(pairing.pairs, (pair) => {
    return create({
      'Pairing Id': pairing.id,
      'Paired On': pairing.createdAt.substr(0, 10),
      'Teacher': pair.teacherName,
      'Learner': pair.learnerName,
      'Skill': pair.skills
    })
  })
  return pairing
}

// removes a Pairing from Airtable
export const destroyPairing = async (teamId, tableName, pairingId) => {
  const base = await getBase(teamId)
  const pairingRecords = await _getAllRecords(base(tableName).select({
    view: 'Grid view',
    fields: [],
    filterByFormula: `{Pairing Id}='${pairingId}'`
  }))
  const destroy = Promise.promisify(base(tableName).destroy)
  await Promise.map(pairingRecords, (record) => {
    return destroy(record.getId())
  })
  return pairingId
}


