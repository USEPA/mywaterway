const supertest = require('supertest');
const app = require('../app/app');

describe('Test example', () => {
  test('GET /api/health should return UP', async () => {
    const response = await supertest(app)
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ status: 'UP' });
  });

  test('GET /api/configFiles should return config json', async () => {
    const response = await supertest(app)
      .get('/api/configFiles')
      .expect(200)
      .expect('Content-Type', /json/);
  });

  test('GET /api/supportedBrowsers', async () => {
    await supertest(app)
      .get('/api/supportedBrowsers')
      .expect(200)
      .expect('Content-Type', /json/);
  });

  test('GET non existent api route', async () => {
    const response = await supertest(app)
      .get('/api/thisIsNotReal')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'The api route does not exist.' });
  });

  test('POST non existent api route', async () => {
    const response = await supertest(app)
      .post('/api/thisIsNotReal')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'The api route does not exist.' });
  });
});
