jest.mock('../src/config/redis', () => require('./helpers/mocks').createRedisMock());
jest.mock('../src/config/rabbitmq', () => require('./helpers/mocks').createRabbitMock());

const request = require('supertest');
const app = require('../src/index');
const redis = require('../src/config/redis');

describe('GET /health', () => {
  it('200 kalau Redis bisa di-ping', async () => {
    redis.ping.mockResolvedValue('PONG');

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'gateway-service',
      checks: { redis: true },
    });
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('503 + degraded kalau Redis error', async () => {
    redis.ping.mockRejectedValue(new Error('redis down'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'degraded',
      service: 'gateway-service',
      checks: { redis: false },
    });
  });
});

describe('route yang tidak terdaftar', () => {
  it('membalas 404', async () => {
    const res = await request(app).get('/route-tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});
