const redis = require('../config/redis');

module.exports = async (req, res, next) => {
  const apiKey = req.apiKey;
  const cacheKey = `apikey:${apiKey}`;

  try {
    const cached = await redis.get(cacheKey);

    if (!cached) {
      return res.status(403).json({
        error: 'Invalid or inactive API key',
      });
    }

    const parsed = JSON.parse(cached);
    req.apiKeyId = parsed.id;
    req.userId = parsed.userId;
    next();
  } catch (error) {
    console.error('[gateway-service] Validate key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};