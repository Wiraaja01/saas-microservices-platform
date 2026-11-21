// Test untuk "wiring" aplikasi: /health, route 404, dan pemasangan middleware.
//
// Kenapa penting: readiness/liveness probe di Kubernetes memanggil /health,
// dan `kubectl rollout status` di CI menunggu probe itu lolos. Kalau /health
// rusak, deploy akan gagal walau semua unit test lain hijau.

jest.mock('../src/config/prisma', () => require('./helpers/prismaMock').createPrismaMock());
jest.mock('../src/config/redis', () => ({ set: jest.fn(), get: jest.fn(), on: jest.fn() }));

const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/config/prisma');

describe('GET /health', () => {
  it('200 + status ok kalau database bisa di-query', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'api-service' });
    // timestamp harus berupa string ISO yang valid
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('503 + status unhealthy kalau database error', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unhealthy', error: 'connection refused' });
  });
});

describe('route yang tidak terdaftar', () => {
  it('membalas 404 dengan pesan Route not found', async () => {
    const res = await request(app).get('/route-yang-tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});

describe('body JSON', () => {
  it('menerima body JSON dari client', async () => {
    // /api/auth/register membalas 400 kalau email/password kosong.
    // Artinya express.json() sudah terpasang dan body berhasil di-parse.
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'tanpa email dan password' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email and password are required' });
  });
});
