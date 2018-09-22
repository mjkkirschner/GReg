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
function sendSlackNotification(message, testMode) {
  const url = secrets.mailgun.slackWebhook;
  const data = `payload=${JSON.stringify({
    text: message,
  })}`;
  if (testMode) {
    console.log("SlackMessage:", data);
    return;
  }
  agent.post(url)
    .set('accept', 'json')
    .send(data)
    .end((error, res) => {
      if (error) console.log(error);
    });
}

/**
 * This function sends notifications to notification channels
 * @param {*} message - message to send
 * @param {*} testMode - logs instead of sending out real notifications.

 */
exports.sendNotification = function(message, testMode) {
  sendSlackNotification(message, testMode);
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
 * @param {*} req - original webhook request - if it contains the x-test-mode header, real requests will not be made.
 * @param {*} res - response to send to client.
 * @param {Function} notificationCallback - a function of the form (message, testmode) which is 
 * called to send notifications for errors in updating tasks.

 */
function updateGDPRTask(req, res, notificationCallback) {
  const testMode = req.headers['x-test-mode'] == "true";

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
  const updateUrl = secrets.forge.update_url;

  // don't make the request in testmode.
  if (testMode) {
    console.log("testMode: calling update GDPR task, payload:");
    console.log('body:', ret.body);
    console.log('uri:', updateUrl);
    return;
  }

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
      agent.post(updateUrl)
        .set('Authorization', `Bearer ${resp.access_token}`)
        .set('accept', 'json')
        .send(ret.body)
        .end((error, postRes) => {
          if (postRes.statusCode != 200 && notificationCallback) {
            notificationCallback(`GDPR Package Manager TaskId  ${taskId} Update Failed, ${postRes.text}`, testMode);
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
 * This function handles the incoming GDPR request - if in test mode this function
 * won't actually update tasks or post to slack. (x-test-mode = 'true' header).
 * @param {*} req TaskID is embedded inside the request object's body.payload
 * @param {*} res - response back to caller of the webhook
 */
exports.handleGDPRRequest = function (req, res, notificationCallback) {
  const testMode = req.headers['x-test-mode'] == "true";

  const userInfo = req.body.payload.user_info;
  const secret = secrets.forge.gdpr_id;
  // check whether the hash matches. Ignore the request if
  // has does not match.
  const hash = `sha1hash=${
    crypto.createHmac('sha1', secret)
      // pass utf-8 explicitly as the default encoding changed in node >6.x
      .update(JSON.stringify(req.body), 'utf8')
      .digest('hex')}`;

  // if user email or id is valid and signature is valid then try to find user.
  if ((userInfo.email != "" || userInfo.oxygen_id != "") && req.headers['x-adsk-signature'] == hash) {
    // check the user info in the database. - but ignore empty strings that might match.
    // we don't want to match another user with an empty string for id or email for example.
    const email = userInfo.email == "" ? "INVALID" : userInfo.email;
    const oxygen_id = userInfo.id == "" ? "INVALID" : userInfo.id;

    UserModel.findOne({ $or: [{ email }, { oxygen_id }] }, (err, user) => {
      if (err) {
        console.log('error in finding the user', err);
        res.send(err);
      }
      // if the user is not found, then update the GDPR task
      if (!user) {
        console.log('user not found');
        updateGDPRTask(req, res, notificationCallback);
        res.status(200).send('Task updated');
      }
      // Send email / slack notifications for valid users
      else {
        const taskId = req.body.payload.taskId;
        const message = `GDPR Package Manager : Delete request for the task ${taskId}`;
        if (notificationCallback) {
          notificationCallback(message, testMode);
        }
        res.status(200).send(message);
      }
    });
  }
  // if both email and ox id are empty, we assume this is not a real user and close the task.
  else if (userInfo.email == "" && userInfo.id == "" && req.headers['x-adsk-signature'] == hash) {
    updateGDPRTask(req, res, notificationCallback);
    res.status(200).send('Task updated');
  } else {
    console.log('sending 403 - invalid hash');
    res.status(403).send('Not called from webhook service, invalid hash');
  }
};
