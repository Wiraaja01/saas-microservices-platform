const express = require('express');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const redis = require('../config/redis')
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Generate a new API Key
// POST /api/keys
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const apiKey = `sk-${crypto.randomBytes(24).toString('hex')}`;

    const key = await prisma.apiKey.create({
      data: { key: apiKey, userId: req.userId, name: name || 'Default Key' },
      select: { id: true, key: true, name: true, isActive: true, createdAt: true },
    });

    await redis.set(
      `apikey:${apiKey}`,
      JSON.stringify({ id: key.id, userId: req.userId })
    );
    console.log(`[api-service] 🔑 API key synced to Redis: ${apiKey.slice(0, 12)}...`);
    
    res.status(201).json({ message: 'API Key created', apiKey: key });
  } catch (error) {
    console.error('Generate key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's keys
// GET /api/keys
router.get('/', async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: { id: true, key: true, name: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ total: keys.length, keys });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke key
// DELETE /api/keys/:id
router.delete('/:id', async (req, res) => {
  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!key) return res.status(404).json({ error: 'API Key not found' });

    await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'API Key revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;