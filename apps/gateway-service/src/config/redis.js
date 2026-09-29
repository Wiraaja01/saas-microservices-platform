const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('connect', () => console.log('[gateway-service] ✅ Redis connected'));
redis.on('error', (err) => console.error('[gateway-service] ❌ Redis error:', err.message));

module.exports = redis;
