require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');

const authRoutes = require('./routes/auth.routes');
const keysRoutes = require('./routes/keys.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[api-service] ${req.method} ${req.path}`);
  next();
});

// Pantau kesehatan layanan dengan endpoint /health
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'api-service', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[api-service] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`🚀 API Service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down API Service...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
