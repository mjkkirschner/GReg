
const request = require('supertest');
const mocha = require('mocha');
const crypto = require('crypto');

const app = require('../src/app.js');

const testRequest = request(app);

const user = require('../src/lib/users.js');
const secrets = require("../src/lib/secrets.js");


function generateHash(data) {
  const secret = secrets.forge.gdpr_id;
  // check whether the hash matches. Ignore the request if
  // has does not match.
  const hash = 'sha1hash='
        + crypto.createHmac('sha1', secret)
        // pass utf-8 explicitly as the default encoding changed in node >6.x
          .update(JSON.stringify(data), 'utf8')
          .digest('hex');
  return hash;
}
function getRandId() {
  const id = crypto.randomBytes(16).toString("hex");
  return id;
}

function generateRandomTask(status) {
  return {
    status,
    description: "",
    number: "aTaskId" + getRandId(),
    user_type: "individual",
    request_type: "gdpr.delete",
    request_number: "aRequestNumber",
    client_id: "aClientID",
    created_date: "2018-07-27 18:15:12",
    notify_date: "2018-07-27 18:15:14",
    user_o2_id: "AnOxygenID" + getRandId(),
    user_name: "auser" + getRandId(),
    user_email: "auser" + getRandId() + "@example.com",
    app_name: "Some Application",
  };
}


/**
 * Constructor of webhook endpoint test task payload.
 * @param {*} task a task object
 * @param {*} authDetails endpoint and auth details for a product
 */
function constructMockWebhookPayload(task, authDetails) {
  const date = "aStableDate";
  const payload = {
    version: 1,
    hook: {
      eventType: task.request_type,
      hookId: 'GDPR Notification System',
      clientID: authDetails.client_id,
      webhookEndpoint: authDetails.webhook_endpoint,
      createdDate: date,
    },
    payload: {
      version: 1,
      taskId: task.number,
      user_info: {
        id: task.user_o2_id,
        email: task.user_email,
        name: task.user_name,
      },
      callbackUrl: authDetails.callback_url,
      respondBy: date,
      status: task.status,
    },
  };
  return payload;
}

describe('POST /gdprDeleteRequest', () => {
  it('should respond with 403 for inconsistent hash signature', (done) => {
    const task = generateRandomTask();

    const name = task.user_name;
    const email = task.user_email;
    const id = task.user_o2_id;
    // generate test user.
    user.initDebugUser(name, email, id, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const signature = "INCORRECT_SIGNATURE";
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect(403, done);
    });
  });

  it('should not return 403 if user_email or name includes non ASCII characters', (done) => {
    const task = generateRandomTask();
    task.user_email = "ЕЀЁName@example.com";
    task.user_name = "ЕЀЁName";
    task.user_o2_id = "aStableID";
    task.number = "aStableID";

    const name = task.user_name;
    const email = task.user_email;
    const id = task.user_o2_id;
    // generate test user.
    user.initDebugUser(name, email, id, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
      const signature = generateHash(testWebhookPayload);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect("GDPR Package Manager : Delete request for the task " + task.number)
        .expect(200, done);
    });
  });

  it('should respond with 200 and open task if user has email and oxygen id and is found', (done) => {
    const task = generateRandomTask();
    task.user_email = "aValidEmail@example.com";
    task.user_name = "aValidName";
    task.user_o2_id = "ao2StableID";
    task.number = "aStableID";

    const name = task.user_name;
    const email = task.user_email;
    const id = task.user_o2_id;
    // generate test user.
    user.initDebugUser(name, email, id, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
      const signature = generateHash(testWebhookPayload);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect("GDPR Package Manager : Delete request for the task " + task.number)
        .expect(200, done);
    });
  });

  it('should respond with 200 and open task if user has email only and is found', (done) => {
    const task = generateRandomTask();
    task.user_email = "aValidEmail@example.com";
    task.user_name = "aValidName";
    task.user_o2_id = "";
    task.number = "aStableID";

    const name = task.user_name;
    const email = task.user_email;
    const id = task.user_o2_id;
    // generate test user.
    user.initDebugUser(name, email, id, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
      const signature = generateHash(testWebhookPayload);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect("GDPR Package Manager : Delete request for the task " + task.number)
        .expect(200, done);
    });
  });

  it('should respond with 200 and open task if user has ox-id only and is found', (done) => {
    const task = generateRandomTask();
    task.user_email = "";
    task.user_o2_id = "anOXID";
    task.number = "aStableID";

    const name = task.user_name;
    const email = task.user_email;
    const id = task.user_o2_id;
    // generate test user.
    user.initDebugUser(name, email, id, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
      const signature = generateHash(testWebhookPayload);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect("GDPR Package Manager : Delete request for the task " + task.number)
        .expect(200, done);
    });
  });

  it('should close task if user is not in database', (done) => {
    const task = generateRandomTask();
    task.user_email = "aValidEmail@example.com";
    task.user_name = "aValidName";
    task.user_o2_id = "ao2StableID";
    task.number = "aStableID";

    const name = task.user_name;

    // make sure test user is gone.
    user.cleanupDebugUser(name, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
      const signature = generateHash(testWebhookPayload);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect("Task updated")
        .expect(200, done);
    });
  });

  it(`should close task if user is not in database even
     if they have empty email and db contains another user with empty email`, (done) => {
    const task = generateRandomTask();
    task.user_email = "";
    task.user_name = "aValidName";
    task.user_o2_id = "ao2StableID";
    task.number = "aStableID";

    const name = task.user_name;

    // make sure test user is gone.
    user.cleanupDebugUser(name, () => {
      user.initDebugUser("anotherUser", "", "anotherUserId", () => {
        const authDetails = {
          webhook_endpoint: "gdprDeleteRequestHandler",
          client_id: "a client id",
          callback_url: "updateTaskURL",
        };
        const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
        const signature = generateHash(testWebhookPayload);

        testRequest
          .post('/gdprDeleteRequest')
          .set('x-adsk-signature', signature)
          .set('x-test-mode', 'true')
          .send(testWebhookPayload)
          .expect("Task updated")
          .expect(200, done);
      });
    });
  });

  it(`should close task if user is not in database even
    if they have empty o2-id and db contains another user with empty o2-id`, (done) => {
    const task = generateRandomTask();
    task.user_email = "aValidEmail@examplecom";
    task.user_name = "aValidName";
    task.user_o2_id = "";
    task.number = "aStableID";

    const name = task.user_name;

    // make sure test user is gone.
    user.cleanupDebugUser(name, () => {
      user.initDebugUser("anotherUser", "anotherEmail", "", () => {
        const authDetails = {
          webhook_endpoint: "gdprDeleteRequestHandler",
          client_id: "a client id",
          callback_url: "updateTaskURL",
        };
        const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
        const signature = generateHash(testWebhookPayload);

        testRequest
          .post('/gdprDeleteRequest')
          .set('x-adsk-signature', signature)
          .set('x-test-mode', 'true')
          .send(testWebhookPayload)
          .expect("Task updated")
          .expect(200, done);
      });
    });
  });


  it('should respond with 200 and close task if user has empty email and o2-id', (done) => {
    const task = generateRandomTask();
    task.user_email = "";
    task.user_name = "aValidName";
    task.user_o2_id = "";
    task.number = "aStableID";

    const name = task.user_name;

    // make sure test user is gone.
    user.cleanupDebugUser(name, () => {
      const authDetails = {
        webhook_endpoint: "gdprDeleteRequestHandler",
        client_id: "a client id",
        callback_url: "updateTaskURL",
      };
      const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
      const signature = generateHash(testWebhookPayload);

      testRequest
        .post('/gdprDeleteRequest')
        .set('x-adsk-signature', signature)
        .set('x-test-mode', 'true')
        .send(testWebhookPayload)
        .expect("Task updated")
        .expect(200, done);
    });
  });

  it('should respond with 200 and close task if user has empty email and o2-id and another user is in db with empty data', (done) => {
    const task = generateRandomTask();
    task.user_email = "";
    task.user_name = "aValidName";
    task.user_o2_id = "";
    task.number = "aStableID";

    const name = task.user_name;

    // make sure test user is gone.
    user.cleanupDebugUser(name, () => {
      user.initDebugUser("anotherUser", "", "", () => {
        const authDetails = {
          webhook_endpoint: "gdprDeleteRequestHandler",
          client_id: "a client id",
          callback_url: "updateTaskURL",
        };
        const testWebhookPayload = constructMockWebhookPayload(task, authDetails);
        const signature = generateHash(testWebhookPayload);

        testRequest
          .post('/gdprDeleteRequest')
          .set('x-adsk-signature', signature)
          .set('x-test-mode', 'true')
          .send(testWebhookPayload)
          .expect("Task updated")
          .expect(200, done);
      });
    });
  });
});
