import { __ } from 'i18n'

export default (bot, message, userInfo) => {
  bot.startPrivateConversation(message, (err, convo) => {
    if (err) return console.log(err)
    convo.say(__('firstTimeConversation.presentation1', { name: userInfo.name }))
    convo.say(__('firstTimeConversation.presentation2', { id: bot.config.bot.user_id }))
    convo.say(__('firstTimeConversation.presentation3'))
    convo.say(__('firstTimeConversation.presentation4'))
    convo.ask({
      attachments: [
        {
          title: __('firstTimeConversation.ask'),
          callback_id: '123',
          attachment_type: 'default',
          actions: [
            {
              'name': 'yes',
              'text': __('firstTimeConversation.yes'),
              'value': 'yes',
              'type': 'button'
            },
            {
              'name': 'no',
              'text': __('firstTimeConversation.no'),
              'value': 'no',
              'type': 'button'
            }
          ]
        }
      ]
    }, [
      {
        pattern: 'yes',
        callback: function (reply, convo) {
          convo.say(__('firstTimeConversation.resYes1'))
          convo.say(__('firstTimeConversation.resYes2', { formId: userInfo.formId }))
          convo.say(__('firstTimeConversation.resYes3'))
          convo.say(__('firstTimeConversation.resYes4'))
          convo.next()
        }
      },
      {
        pattern: 'no',
        callback: function (reply, convo) {
          convo.say(__('firstTimeConversation.resNo'))
          convo.next()
        }
      },
      {
        default: true,
        callback: function () {
          console.log('default')
          // do nothing
        }
      }
    ])
  })
}
