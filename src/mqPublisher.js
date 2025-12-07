const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
const QUEUE_NAME = 'click_events';

let channel = null;
let connection = null;

// Initialize RabbitMQ connection
async function connect() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log('✅ Connected to RabbitMQ');

    // Handle connection close
    connection.on('close', () => {
      console.error('❌ RabbitMQ connection closed. Reconnecting...');
      channel = null;
      setTimeout(connect, 5000);
    });

    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
    });

    return channel;
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connect, 5000);
    return null;
  }
}

// Publish event to queue
async function publishEvent(event) {
  try {
    if (!channel) {
      console.warn('⚠️ RabbitMQ channel not ready, attempting to connect...');
      await connect();
    }

    if (channel) {
      const message = JSON.stringify(event);
      channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
      console.log('📤 Event published:', event.action, event.amount);
      return true;
    } else {
      console.error('❌ Failed to publish event: channel not available');
      return false;
    }
  } catch (error) {
    console.error('❌ Error publishing event:', error.message);
    return false;
  }
}

// Initialize connection on module load
connect();

module.exports = {
  publishEvent
};
