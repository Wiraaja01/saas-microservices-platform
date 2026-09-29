const redis = require('../config/redis');

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 60;

module.exports = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required (x-api-key header)' });

  const key = `ratelimit:${apiKey}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, RATE_LIMIT_WINDOW);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - current));

    if (current > RATE_LIMIT_MAX) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSeconds: RATE_LIMIT_WINDOW,
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    console.error('[gateway-service] Rate limiter error:', error);
    // Fail-open strategy: allow request if Redis is down
    req.apiKey = apiKey;
    next();
  }
};