require('dotenv').config();
const express = require('express');
const redis = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const proxyRoutes = require('./routes/proxy.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  console.log(`[gateway-service] ${req.method} ${req.path}`);
  next();
});

// Health check - TIDAK cek postgres lagi
app.get('/health', async (req, res) => {
  const checks = { redis: false };
  try {
    await redis.ping();
    checks.redis = true;
  } catch (_) {}

  const healthy = checks.redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'gateway-service',
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.use('/v1', proxyRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('[gateway-service] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

(async () => {
  await connectRabbitMQ();
  const server = app.listen(PORT, () => {
    console.log(`🚀 Gateway Service running on port ${PORT}`);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down Gateway Service...');
    server.close(async () => {
      redis.disconnect();
      process.exit(0);
    });
  });
})();