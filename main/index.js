import 'babel-polyfill'
import i18n from 'i18n'

import './learnbot/hears'
import './learnbot/cron'

i18n.configure({
  locales:['en', 'fr'],
  directory: __dirname + '/locales',
  objectNotation: true
})