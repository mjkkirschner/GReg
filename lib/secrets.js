const nconf = require('nconf');

// The nconf object looks for values in the order specified here.

// Then, get values from `process.env` and `process.argv`
nconf.env().argv();

// Next, read the values from `config.json`
nconf.file('ssl/config.json');

nconf.defaults({
  MAILGUN_LOGIN: 'Your Mailgun SMTP Username',
  MAILGUN_PASSWORD: 'Your Mailgun SMTP Password',
  FORGE_CLIENT_ID: '',
  FORGE_CLIENT_SECRET: '',
  FORGE_AUTH_URL: '',
  FORGE_UPDATE_URL: '',
  FORGE_GDPR_ID: '',
  EMAIL_DISTRIBUTION: '',
  SLACK_WEBHOOK: '',
});

module.exports = {
  mailgun: {
    login: nconf.get('MAILGUN_LOGIN'),
    password: nconf.get('MAILGUN_PASSWORD'),
    email: nconf.get('EMAIL_DISTRIBUTION'),
    slackWebhook: nconf.get('SLACK_WEBHOOK'),
  },

  forge: {
    client_id: nconf.get('FORGE_CLIENT_ID'),
    client_secret: nconf.get('FORGE_CLIENT_SECRET'),
    auth_url: nconf.get('FORGE_AUTH_URL'),
    update_url: nconf.get('FORGE_UPDATE_URL'),
    gdpr_id: nconf.get('FORGE_GDPR_ID'),
  },
};
