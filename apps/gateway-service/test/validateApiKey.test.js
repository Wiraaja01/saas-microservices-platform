jest.mock('../src/config/redis', () => require('./helpers/mocks').createRedisMock());

const validateApiKey = require('../src/middleware/validateApiKey');
const redis = require('../src/config/redis');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateApiKey', () => {
  it('403 kalau API key tidak ada di cache Redis', async () => {
    redis.get.mockResolvedValue(null);

    const req = { apiKey: 'sk-test' };
    const res = mockRes();
    const next = jest.fn();

    await validateApiKey(req, res, next);

    expect(redis.get).toHaveBeenCalledWith('apikey:sk-test');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or inactive API key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('meloloskan request dan mengisi apiKeyId + userId', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ id: 'key-1', userId: 'user-1' }));

    const req = { apiKey: 'sk-test' };
    const res = mockRes();
    const next = jest.fn();

    await validateApiKey(req, res, next);

    expect(req.apiKeyId).toBe('key-1');
    expect(req.userId).toBe('user-1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('500 kalau isi cache bukan JSON valid', async () => {
    redis.get.mockResolvedValue('bukan-json');

    const req = { apiKey: 'sk-test' };
    const res = mockRes();
    const next = jest.fn();

    await validateApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(next).not.toHaveBeenCalled();
  });

  it('500 kalau Redis error', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));

    const req = { apiKey: 'sk-test' };
    const res = mockRes();
    const next = jest.fn();

    await validateApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
