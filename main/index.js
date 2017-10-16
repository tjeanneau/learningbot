import 'babel-polyfill'
import i18n from 'i18n'

import './learnbot/hears'
import './learnbot/cron'
import '../locales/en.json'
import '../locales/fr.json'

i18n.configure({
  locales:['en', 'fr'],
  objectNotation: true,
  directory: __dirname.replace("/dist", "") + '/locales',
  defaultLocale: 'en',
})