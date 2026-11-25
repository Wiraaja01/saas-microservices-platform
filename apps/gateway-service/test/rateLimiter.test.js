jest.mock('../src/config/redis', () => require('./helpers/mocks').createRedisMock());

const rateLimiter = require('../src/middleware/rateLimiter');
const redis = require('../src/config/redis');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

describe('rateLimiter', () => {
  it('401 kalau header x-api-key tidak ada', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'API key required (x-api-key header)',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('meloloskan request dan mengisi header limit', async () => {
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);

    const req = { headers: { 'x-api-key': 'sk-test' } };
    const res = mockRes();
    const next = jest.fn();

    await rateLimiter(req, res, next);

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:sk-test');
    expect(redis.expire).toHaveBeenCalledWith('ratelimit:sk-test', 60);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
    expect(req.apiKey).toBe('sk-test');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('tidak mengisi ulang expire kalau bukan request pertama', async () => {
    redis.incr.mockResolvedValue(2);

    const req = { headers: { 'x-api-key': 'sk-test' } };
    const res = mockRes();
    const next = jest.fn();

    await rateLimiter(req, res, next);

    expect(redis.expire).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 98);
    expect(next).toHaveBeenCalled();
  });

  it('429 kalau melewati batas', async () => {
    redis.incr.mockResolvedValue(101);

    const req = { headers: { 'x-api-key': 'sk-test' } };
    const res = mockRes();
    const next = jest.fn();

    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Rate limit exceeded',
      retryAfterSeconds: 60,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('fail-open: tetap lanjut kalau Redis error', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));

    const req = { headers: { 'x-api-key': 'sk-test' } };
    const res = mockRes();
    const next = jest.fn();

    await rateLimiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.apiKey).toBe('sk-test');
  });
});
