let request = require('supertest');
const app = require('../app.js');

request = request(app);

describe('POST /validate', () => {
  it('should respond with json', (done) => {
    request
      .get('/validate')
      .auth('test', 'e0jlZfJfKS')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
