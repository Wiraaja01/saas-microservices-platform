jest.mock('../src/config/prisma', () => require('./helpers/prismaMock').createPrismaMock());
jest.mock('../src/config/redis', () => ({ set: jest.fn(), get: jest.fn(), on: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/index');
const prisma = require('../src/config/prisma');

const authHeader = (userId = 'user-1') =>
  `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;

// Helper: bikin daftar log palsu
function makeLogs(count, { latencyMs = 100, tokensUsed = 10, date = '2026-01-01T00:00:00Z' } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    latencyMs,
    tokensUsed,
    createdAt: new Date(date),
  }));
}

describe('proteksi route', () => {
  it('401 kalau tanpa token', async () => {
    const res = await request(app).get('/api/analytics/summary');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/analytics/summary', () => {
  it('menghitung total request, rata-rata latency, dan total token', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }, { id: 'key-2' }]);
    prisma.requestLog.count.mockResolvedValue(2);
    prisma.requestLog.findMany.mockResolvedValue([
      { id: 'log-1', latencyMs: 100, tokensUsed: 10, createdAt: new Date() },
      { id: 'log-2', latencyMs: 300, tokensUsed: 20, createdAt: new Date() },
    ]);

    const res = await request(app).get('/api/analytics/summary').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(2);
    expect(res.body.avgLatencyMs).toBe(200); // (100 + 300) / 2
    expect(res.body.totalTokens).toBe(30); // 10 + 20
    expect(res.body.recentLogs).toHaveLength(2);
  });

  it('membatasi recentLogs maksimal 20 walaupun log ada 25', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }]);
    prisma.requestLog.count.mockResolvedValue(25);
    prisma.requestLog.findMany.mockResolvedValue(makeLogs(25, { latencyMs: 100 + 0 }));

    const res = await request(app).get('/api/analytics/summary').set('Authorization', authHeader());

    expect(res.body.recentLogs).toHaveLength(20);
  });

  it('0 dan array kosong kalau user belum punya log', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }]);
    prisma.requestLog.count.mockResolvedValue(0);
    prisma.requestLog.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/analytics/summary').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(0);
    expect(res.body.avgLatencyMs).toBe(0); // tidak boleh NaN / bagi nol
    expect(res.body.totalTokens).toBe(0);
    expect(res.body.recentLogs).toEqual([]);
  });

  it('hanya menghitung log dari API key milik user yang login', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }]);
    prisma.requestLog.count.mockResolvedValue(0);
    prisma.requestLog.findMany.mockResolvedValue([]);

    await request(app).get('/api/analytics/summary').set('Authorization', authHeader());

    // filter wajib memakai daftar key milik user, bukan semua log
    expect(prisma.requestLog.count).toHaveBeenCalledWith({
      where: { apiKeyId: { in: ['key-1'] } },
    });
  });

  it('500 kalau database error', async () => {
    prisma.apiKey.findMany.mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/analytics/summary').set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('GET /api/analytics/daily', () => {
  it('mengelompokkan log per tanggal dan menghitung rata-rata latency', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }]);
    prisma.requestLog.findMany.mockResolvedValue([
      { createdAt: new Date('2026-01-01T10:00:00Z'), latencyMs: 100 },
      { createdAt: new Date('2026-01-01T12:00:00Z'), latencyMs: 300 },
      { createdAt: new Date('2026-01-02T09:00:00Z'), latencyMs: 50 },
    ]);

    const res = await request(app).get('/api/analytics/daily').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { date: '2026-01-01', count: 2, avgLatency: 200 }, // (100+300)/2
      { date: '2026-01-02', count: 1, avgLatency: 50 },
    ]);
  });

  it('membulatkan rata-rata latency ke bilangan bulat', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }]);
    prisma.requestLog.findMany.mockResolvedValue([
      { createdAt: new Date('2026-01-01T10:00:00Z'), latencyMs: 100 },
      { createdAt: new Date('2026-01-01T11:00:00Z'), latencyMs: 101 },
    ]);

    const res = await request(app).get('/api/analytics/daily').set('Authorization', authHeader());

    // (100 + 101) / 2 = 100.5 -> Math.round -> 101
    expect(res.body[0].avgLatency).toBe(101);
  });

  it('200 + array kosong kalau belum ada log', async () => {
    prisma.apiKey.findMany.mockResolvedValue([{ id: 'key-1' }]);
    prisma.requestLog.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/analytics/daily').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 kalau database error', async () => {
    prisma.apiKey.findMany.mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/analytics/daily').set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
