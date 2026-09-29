const amqp = require('amqplib');

let channel = null;
const QUEUE_NAME = 'request_logs';

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'
    );
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    connection.on('close', () => {
      console.warn('[gateway-service] RabbitMQ connection closed. Reconnecting...');
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    console.log('[gateway-service] ✅ RabbitMQ connected');
  } catch (error) {
    console.error('[gateway-service] ❌ RabbitMQ error:', error.message);
    channel = null;
    setTimeout(connectRabbitMQ, 5000);
  }
}

function publishLog(logPayload) {
  if (!channel) {
    console.warn('[gateway-service] RabbitMQ channel not ready. Dropping log.');
    return false;
  }
  return channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(logPayload)), {
    persistent: true,
  });
}

module.exports = { connectRabbitMQ, publishLog };
