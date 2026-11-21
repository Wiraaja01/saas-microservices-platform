// Test endpoint API key: buat, daftar, dan revoke.
//
// Catatan: semua route di sini dilindungi authMiddleware (router.use),
// jadi setiap request butuh header Authorization yang valid.

jest.mock('../src/config/prisma', () => require('./helpers/prismaMock').createPrismaMock());
jest.mock('../src/config/redis', () => ({ set: jest.fn(), get: jest.fn(), on: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/index');
const prisma = require('../src/config/prisma');
const redis = require('../src/config/redis');

const authHeader = (userId = 'user-1') =>
  `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;

describe('proteksi route', () => {
  it('401 kalau tanpa token', async () => {
    const res = await request(app).get('/api/keys');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/keys', () => {
  it('201 membuat key berformat sk-<48 hex>', async () => {
    prisma.apiKey.create.mockImplementation(async ({ data }) => ({
      id: 'key-1',
      key: data.key,
      name: data.name,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));
    redis.set.mockResolvedValue('OK');

    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', authHeader())
      .send({ name: 'Key buat CI' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('API Key created');
    expect(res.body.apiKey.name).toBe('Key buat CI');
    expect(res.body.apiKey.key).toMatch(/^sk-[0-9a-f]{48}$/);
  });

  it('menyimpan key ke Redis dengan format apikey:<key>', async () => {
    prisma.apiKey.create.mockImplementation(async ({ data }) => ({
      id: 'key-1',
      key: data.key,
      name: data.name,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));
    redis.set.mockResolvedValue('OK');

    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', authHeader('user-99'))
      .send({ name: 'Key Redis' });

    expect(redis.set).toHaveBeenCalledTimes(1);
    const [cacheKey, cacheValue] = redis.set.mock.calls[0];
    expect(cacheKey).toBe(`apikey:${res.body.apiKey.key}`);
    expect(JSON.parse(cacheValue)).toEqual({ id: 'key-1', userId: 'user-99' });
  });

  it("memakai nama 'Default Key' kalau name tidak dikirim", async () => {
    prisma.apiKey.create.mockImplementation(async ({ data }) => ({
      id: 'key-1',
      key: data.key,
      name: data.name,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));
    redis.set.mockResolvedValue('OK');

    const res = await request(app).post('/api/keys').set('Authorization', authHeader()).send({});

    expect(res.status).toBe(201);
    expect(res.body.apiKey.name).toBe('Default Key');
  });

  it('key selalu diikat ke userId dari token, bukan dari body', async () => {
    prisma.apiKey.create.mockImplementation(async ({ data }) => ({
      id: 'key-1',
      key: data.key,
      name: data.name,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));
    redis.set.mockResolvedValue('OK');

    await request(app)
      .post('/api/keys')
      .set('Authorization', authHeader('user-1'))
      // user coba menitipkan userId lain di body
      .send({ name: 'Nakal', userId: 'user-lain' });

    const { data } = prisma.apiKey.create.mock.calls[0][0];
    expect(data.userId).toBe('user-1');
  });

  it('500 kalau penyimpanan gagal', async () => {
    prisma.apiKey.create.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', authHeader())
      .send({ name: 'Gagal' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('GET /api/keys', () => {
  it('200 dan mengembalikan total + daftar key milik user', async () => {
    prisma.apiKey.findMany.mockResolvedValue([
      { id: 'key-1', key: 'sk-aaa', name: 'Pertama', isActive: true, createdAt: new Date() },
      { id: 'key-2', key: 'sk-bbb', name: 'Kedua', isActive: false, createdAt: new Date() },
    ]);

    const res = await request(app).get('/api/keys').set('Authorization', authHeader('user-1'));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.keys).toHaveLength(2);
    expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });

  it('200 + array kosong kalau user belum punya key', async () => {
    prisma.apiKey.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/keys').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, keys: [] });
  });

  it('500 kalau database error', async () => {
    prisma.apiKey.findMany.mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/keys').set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('DELETE /api/keys/:id', () => {
  it('404 kalau key tidak ada atau bukan milik user', async () => {
    prisma.apiKey.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/keys/key-orang-lain')
      .set('Authorization', authHeader('user-1'));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'API Key not found' });
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('200 dan menonaktifkan key (soft delete, bukan hapus permanen)', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({ id: 'key-1', userId: 'user-1' });
    prisma.apiKey.update.mockResolvedValue({ id: 'key-1', isActive: false });

    const res = await request(app)
      .delete('/api/keys/key-1')
      .set('Authorization', authHeader('user-1'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'API Key revoked' });
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { isActive: false },
    });
  });

  it('mencari key dengan filter userId, bukan hanya id', async () => {
    prisma.apiKey.findFirst.mockResolvedValue(null);

    await request(app).delete('/api/keys/key-1').set('Authorization', authHeader('user-7'));

    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
      where: { id: 'key-1', userId: 'user-7' },
    });
  });

  it('500 kalau database error', async () => {
    prisma.apiKey.findFirst.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .delete('/api/keys/key-1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
