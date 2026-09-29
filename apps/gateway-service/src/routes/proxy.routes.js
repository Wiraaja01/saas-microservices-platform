const express = require('express');
const { publishLog } = require('../config/rabbitmq');
const rateLimiter = require('../middleware/rateLimiter');
const validateApiKey = require('../middleware/validateApiKey');

const router = express.Router();

// POST /v1/chat/completions (OpenAI-compatible)
router.post('/chat/completions', rateLimiter, validateApiKey, async (req, res) => {
  const startTime = Date.now();

  try {
    const { messages, model = 'gpt-3.5-turbo' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: "messages" array is required' });
    }

    // --- Simulate upstream AI provider call ---
    // In real world, you'd call OpenAI / Anthropic / etc using axios
    // const response = await axios.post('https://api.openai.com/v1/chat/completions', ...)
    await new Promise((resolve) => setTimeout(resolve, 200)); // simulate 200ms latency

    const mockResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `[Mock AI] You said: "${messages[messages.length - 1]?.content || '...'}"`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    const latencyMs = Date.now() - startTime;

    // Async publish log to RabbitMQ (non-blocking)
    publishLog({
      apiKeyId: req.apiKeyId,
      endpoint: '/v1/chat/completions',
      method: 'POST',
      statusCode: 200,
      latencyMs,
      model,
      tokensUsed: mockResponse.usage.total_tokens,
      timestamp: new Date().toISOString(),
    });

    res.json(mockResponse);
  } catch (error) {
    console.error('[gateway-service] Proxy error:', error);

    publishLog({
      apiKeyId: req.apiKeyId,
      endpoint: '/v1/chat/completions',
      method: 'POST',
      statusCode: 500,
      latencyMs: Date.now() - startTime,
      model: req.body?.model || 'unknown',
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({ error: 'Upstream provider error' });
  }
});

module.exports = router;