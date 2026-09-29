const express = require('express');
const prisma = require('../config/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const userKeys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const keyIds = userKeys.map((k) => k.id);

    const [totalRequests, logs] = await Promise.all([
      prisma.requestLog.count({ where: { apiKeyId: { in: keyIds } } }),
      prisma.requestLog.findMany({
        where: { apiKeyId: { in: keyIds } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const avgLatency =
      logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + l.latencyMs, 0) / logs.length) : 0;
    const totalTokens = logs.reduce((acc, l) => acc + l.tokensUsed, 0);

    res.json({
      totalRequests,
      avgLatencyMs: avgLatency,
      totalTokens,
      recentLogs: logs.slice(0, 20),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/daily (last 7 days)
router.get('/daily', async (req, res) => {
  try {
    const userKeys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const keyIds = userKeys.map((k) => k.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = await prisma.requestLog.findMany({
      where: {
        apiKeyId: { in: keyIds },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, latencyMs: true },
    });

    // Group by day
    const daily = {};
    logs.forEach((log) => {
      const day = log.createdAt.toISOString().split('T')[0];
      if (!daily[day]) daily[day] = { date: day, count: 0, totalLatency: 0 };
      daily[day].count++;
      daily[day].totalLatency += log.latencyMs;
    });

    const result = Object.values(daily).map((d) => ({
      date: d.date,
      count: d.count,
      avgLatency: Math.round(d.totalLatency / d.count),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;