# Mangrove Learn

Automatically pair people based on the skills they can teach and those they want to learn.

## Usages

### Installation

Clone the repo, then run:
```bash
$ npm install
```

### Set environmental variables

Create a .env file with the following variables and their values:
```bash
LEARNBOT_MONGODB_URI=***************
LEARNBOT_SLACK_CLIENT_ID=***************
LEARNBOT_SLACK_CLIENT_SECRET=***************
AIRTABLE_API_KEY=***************
AIRTABLE_BASE_KEY=***************
AIRTABLE_MEMBERS=***************
AIRTABLE_MOOD=***************
AIRTABLE_APPLICANTS=***************
AIRTABLE_PAIRING=***************
NODE_ENV=DEVELOPMENT
LEARNBOT_HOSTNAME={ngrok url}
PORT=5000
```

### How to use in development

Use a tunnelling software like ngrok to expose each bot under its own domain.

set up the domains in your ~/.ngrok2/ngrok.yml file
```
tunnels:
  learnbot:
    proto: http
    addr: 5000
    subdomain: learningbot
    
```

Start ngrok
```
$ ngrok start learnbot
```

Now set up the subdomains given by ngrok in your .env file
```
LEARNBOT_HOSTNAME=learningbot.ngrok.com
```

Finally start the app
```
$ PORT=5000 npm start
```

You can now navigate to https://moodbot.ngrok.io/moodbot and https://learningbot.ngrok.io/learningbot

### How to use in production

Set up your DNS to point dedicated subdomains to the Heroku app
```
CNAME  learn.mydomain.com  myapp.herokuapp.com
```

Set up the domain in the app's environment variables
```
$ heroku config:set LEARNBOT_HOSTNAME=learn.mydomain.com --app myapp
```

Register the domains with the Heroku router
```
$ heroku domains:add learn.mydomain.com --app myapp
```

You can now navigate to http://mood.mydomain.com/moodbot and http://learn.mydomain.com/learningbot

### Run bots

In local for development:
```bash
$ npm start
```

Lint code:
```bash
$ npm run lint
```

Fix lint errors:
```bash
$ npm run fix
```

Building:
```bash
$ npm run build
```

Heroku dynos:
```bash
$ npm start
```
