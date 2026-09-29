require('dotenv').config();
const prisma = require('./config/prisma');
const { startConsumer } = require('./config/rabbitmq');

let processedCount = 0;

async function handleLog(data) {
  await prisma.requestLog.create({
    data: {
      apiKeyId: data.apiKeyId,
      endpoint: data.endpoint || '/v1/chat/completions',
      method: data.method || 'POST',
      statusCode: data.statusCode || 200,
      latencyMs: data.latencyMs || 0,
      model: data.model || null,
      tokensUsed: data.tokensUsed || 0,
    },
  });

  processedCount++;
  if (processedCount % 100 === 0) {
    console.log(`[worker-service] 📊 Processed ${processedCount} logs`);
  }
}

// Bootstrap
startConsumer(handleLog);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log(`[worker-service] Shutting down. Total processed: ${processedCount}`);
  await prisma.$disconnect();
  process.exit(0);
});