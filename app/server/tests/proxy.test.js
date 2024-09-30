const supertest = require('supertest');
const app = require('../app/app');

describe('Proxy tests', () => {
  test('GET /proxy should return data', async () => {
    await supertest(app)
      .get(
        '/proxy?url=https://attains.epa.gov/attains-public/api/huc12summary?huc=030902010200',
      )
      .expect(200)
      .expect('Content-Type', /json/);
  });

  test('Get /proxy Invalid proxy request', async () => {
    const response = await supertest(app)
      .get('/proxy?url=https://google.com')
      .expect(403)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'Invalid proxy request' });
  });

  test('Get /proxy Invalid URL', async () => {
    const response = await supertest(app)
      .get('/proxy')
      .expect(403)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'Invalid URL' });
  });

  test('Get /proxy Proxy Request Error', async () => {
    const response = await supertest(app)
      .get(
        '/proxy?url=https://attains.epa.gov/attains-public/api/nonExistentRoute',
      )
      .expect(503)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'Proxy Request Error' });
  });

  test('GET non existent api route', async () => {
    const response = await supertest(app)
      .get('/proxy/thisIsNotReal')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'The api route does not exist.' });
  });

  test('POST non existent api route', async () => {
    const response = await supertest(app)
      .post('/proxy')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'The api route does not exist.' });
  });

  test('GET test stream requests', async () => {
    await supertest(app)
      .get(
        '/proxy?url=https://cyan.epa.gov/waterbody/image/?OBJECTID=6624886&year=2024&day=273',
      )
      .expect(200);
  });
});
