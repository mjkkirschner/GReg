const crypto = require('crypto');
const request = require('request');
const agent = require('superagent');
const UserModel = require('../models/user').UserModel;
const secrets = require('./secrets');
// PackageManager node version doesn't support node_mailer.
// let nodemailer = require('nodemailer');

// function smtpTransport() {
//     return nodemailer.createTransport({
//         service: 'Mailgun',
//         auth: {
//             user: secrets.mailgun.login,
//             pass: secrets.mailgun.password
//         }
//     });
// }


/**
 * This function sends slack notification.
 * @param {*} message
 */
function sendSlackNotification(message) {
  const url = secrets.mailgun.slackWebhook;
  const data = `payload=${JSON.stringify({
    text: message,
  })}`;

  agent.post(url)
    .set('accept', 'json')
    .send(data)
    .end((error, res) => {
      if (error) console.log(error);
    });
}

/**
 * This function sends email notification
 * @param {*} message
 */
function sendNotification(message) {
  sendSlackNotification(message);
  // MailGun sometimes doesn't work.
  // smtpTransport().sendMail({
  //     from: "GDPR request",
  //     to: secrets.mailgun.email
  //     subject: "GDPR Package Manager delete request",
  //     text: message
  // }, function (err) {
  //     if (err) {
  //         console.log("error in sending mail", err);
  //     }
  // });
}

/**
 * This function updates the GDPR task. Email / Slack notifications are
 * sent incase of any error.
 * @param {*} req
 */
function updateGDPRTask(req, res) {
  const taskId = req.body.payload.taskId;
  const ret = {};
  ret.statusCode = 200;
  ret.body = {
    taskId,
    status: {
      code: 'success',
      type: 'no_data',
      description: "User doesn't exist in this product.",
    },
  };

  // use client id and secret and get the access token
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const params = {
    grant_type: 'client_credentials',
    client_id: secrets.forge.client_id,
    client_secret: secrets.forge.client_secret,

  };

  const paramsBody = [];
  Object.keys(params).forEach((key) => {
    paramsBody.push(`${key}=${params[key]}`);
  });

  const authUrl = secrets.forge.auth_url;
  request({
    headers,
    uri: authUrl,
    body: paramsBody.join('&'),
    method: 'POST',
  }, (err, response, body) => {
    let resp;
    try {
      resp = JSON.parse(body);
    } catch (e) {
      resp = body;
    }
    if (!err && response.statusCode === 200) {
      const updateUrl = secrets.forge.update_url;
      agent.post(updateUrl)
        .set('Authorization', `Bearer ${resp.access_token}`)
        .set('accept', 'json')
        .send(ret.body)
        .end((error, postRes) => {
          if (postRes.statusCode !== 200) {
            sendNotification(`GDPR Package Manager TaskId  ${taskId} Update Failed `, postRes.text);
          }
        });
    } else if (err) {
      console.log('error', err);
      res.send(err);
      res.end();
    }
  });
}

/**
 * This function handles the incoming GDPR request
 * @param {*} req TaskID is embedeed inside the request object
 * @param {*} res
 */
exports.handleGDPRRRequest = (req, res) => {
  const userInfo = req.body.payload.user_info;
  const secret = secrets.forge.gdpr_id;
  // check whether the hash matches. Ignore the request if
  // has does not match.
  const hash = `sha1hash=${
    crypto.createHmac('sha1', secret)
      .update(JSON.stringify(req.body))
      .digest('hex')}`;

  if (userInfo.email !== '' && req.headers['x-adsk-signature'] === hash) {
    // check the user info in the database.
    UserModel.findOne({ email: userInfo.email }, (err, user) => {
      if (err) {
        console.log('error in finding the user', err);
        res.send(err);
      }
      // if the user is not found, then update the GDPR task
      if (!user) {
        console.log('user not found');
        updateGDPRTask(req, res);
        res.status(200).send('Task updated');
      } else {
        // Send email / slack notifications for valid users
        const taskId = req.body.payload.taskId;
        const message = `GDPR Package Manager : Delete request for the task ${taskId}`;
        sendNotification(message);
        res.send({ statusCode: 200 });
      }
    });
  } else if (req.headers['x-adsk-signature'] === hash) {
    updateGDPRTask(req, res);
    res.status(200).send('Task updated');
  } else {
    res.status(403).send('Not called from webhook service');
  }
};
