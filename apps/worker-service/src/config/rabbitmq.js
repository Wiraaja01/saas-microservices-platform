const amqp = require('amqplib');

const QUEUE_NAME = 'request_logs';

async function startConsumer(onMessage) {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'
    );
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    const concurrency = parseInt(process.env.WORKER_CONCURRENCY) || 10;
    channel.prefetch(concurrency);

    console.log(`[worker-service] Connected. Processing queue "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        await onMessage(data);
        channel.ack(msg);
      } catch (error) {
        console.error('[worker-service] Failed to process message:', error.message);
        // Requeue once, then drop to avoid poison-message loop
        channel.nack(msg, false, false);
      }
    });

    connection.on('close', () => {
      console.warn('[worker-service] Connection closed. Reconnecting...');
      setTimeout(() => startConsumer(onMessage), 5000);
    });
  } catch (error) {
    console.error('[worker-service] RabbitMQ connection failed:', error.message);
    setTimeout(() => startConsumer(onMessage), 5000);
  }
}

module.exports = { startConsumer };