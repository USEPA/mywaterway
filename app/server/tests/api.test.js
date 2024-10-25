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

  test('GET test checkClientRouteExists middleware', async () => {
    const response = await supertest(app)
      .get('/community/lake%20okeechobee/overview')
      .expect(404);
  });

  test('GET test checkClientRouteExists middleware', async () => {
    await supertest(app)
      .get('/communityTest/lake%20okeechobee/overview')
      .expect(404);
  });

  test('PUT should be unauthorized', async () => {
    await supertest(app).put('/api/health').expect(401);
  });

  test('DELETE should be unauthorized', async () => {
    await supertest(app).delete('/api/health').expect(401);
  });

  test('GET nonexistent rout', async () => {
    await supertest(app)
      .get('/bogusRoute')
      .expect(404)
      .expect('Content-type', 'text/html; charset=UTF-8');
  });
});
