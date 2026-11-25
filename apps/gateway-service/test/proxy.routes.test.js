jest.mock('../src/config/redis', () => require('./helpers/mocks').createRedisMock());
jest.mock('../src/config/rabbitmq', () => require('./helpers/mocks').createRabbitMock());

const request = require('supertest');
const app = require('../src/index');
const redis = require('../src/config/redis');
const { publishLog } = require('../src/config/rabbitmq');

const ENDPOINT = '/v1/chat/completions';

function apiKeyDitemukan() {
  redis.get.mockResolvedValue(JSON.stringify({ id: 'key-1', userId: 'user-1' }));
}

beforeEach(() => {
  redis.incr.mockResolvedValue(1);
  redis.expire.mockResolvedValue(1);
  apiKeyDitemukan();
});

describe('POST /v1/chat/completions', () => {
  it('401 kalau header x-api-key tidak dikirim', async () => {
    const res = await request(app).post(ENDPOINT).send({ messages: [] });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'API key required (x-api-key header)' });
    expect(publishLog).not.toHaveBeenCalled();
  });

  it('403 kalau API key tidak ada di Redis', async () => {
    redis.get.mockResolvedValue(null);

    const res = await request(app)
      .post(ENDPOINT)
      .set('x-api-key', 'sk-palsu')
      .send({ messages: [] });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Invalid or inactive API key' });
  });

  it('400 kalau "messages" bukan array', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('x-api-key', 'sk-test')
      .send({ messages: 'halo' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid request: "messages" array is required',
    });
    expect(publishLog).not.toHaveBeenCalled();
  });

  it('200 + bentuk response OpenAI-compatible', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('x-api-key', 'sk-test')
      .send({ messages: [{ role: 'user', content: 'halo dunia' }] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      object: 'chat.completion',
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: { role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    expect(res.body.choices[0].message.content).toContain('halo dunia');
    expect(typeof res.body.id).toBe('string');
    expect(typeof res.body.created).toBe('number');
  });

  it('memakai model dari request kalau dikirim', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('x-api-key', 'sk-test')
      .send({ messages: [{ role: 'user', content: 'tes' }], model: 'gpt-4o' });

    expect(res.status).toBe(200);
    expect(res.body.model).toBe('gpt-4o');
  });

  it('mengirim log ke RabbitMQ setelah response sukses', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('x-api-key', 'sk-test')
      .send({ messages: [{ role: 'user', content: 'tes' }] });

    expect(res.status).toBe(200);
    expect(publishLog).toHaveBeenCalledTimes(1);
    expect(publishLog).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'key-1',
        endpoint: ENDPOINT,
        method: 'POST',
        statusCode: 200,
        model: 'gpt-3.5-turbo',
        tokensUsed: 30,
      })
    );
  });

  it('500 kalau publishLog error', async () => {
    publishLog
      .mockImplementationOnce(() => {
        throw new Error('rabbit down');
      })
      .mockImplementation(() => true);

    const res = await request(app)
      .post(ENDPOINT)
      .set('x-api-key', 'sk-test')
      .send({ messages: [{ role: 'user', content: 'tes' }] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Upstream provider error' });
    expect(publishLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ statusCode: 500, tokensUsed: 0 })
    );
  });
});
