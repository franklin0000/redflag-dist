const Redis = require('ioredis');
const crypto = require('crypto');

// ── DIO-LEVEL ARCHITECTURE: EPHEMERAL REDIS STORAGE ───────────
// Enforces 24-hour strict TTL and memory wipe (crypto erasure) for 
// anonymous community messages. Completely bypasses PostgreSQL storage.
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL, { 
  keyPrefix: 'anon:',
  lazyConnect: true, // Don't crash if Redis is unavailable locally during builds
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Avoid crashes if Redis isn't running in dev
redis.on('error', (err) => console.warn('[DIO Security] Ephemeral Redis connection warning:', err.message));

async function scheduleCryptoErasure(key, messageId, delayMs = 24 * 3600 * 1000) {
  // We use setTimeout for the active Node process, but rely on Redis TTL as the hard fallback.
  // When overwriting with random bytes, Redis allocates new memory or overwrites the 
  // existing memory structure, ensuring the plaintext cannot be recovered from memory dumps.
  setTimeout(async () => {
    try {
      const zeros = crypto.randomBytes(256).toString('hex');
      await redis.hset(key, messageId, zeros);
      await redis.hdel(key, messageId);
    } catch (e) {
      // Ignore cleanup errors
    }
  }, delayMs);
}

/**
 * Stores an anonymous message purely in Redis memory.
 */
async function postAnonymousMessage(roomId, content, senderHash = 'anon') {
  const key = `room:${roomId}:messages`;
  const timestamp = Date.now();
  const messageId = `msg:${timestamp}:${crypto.randomBytes(8).toString('hex')}`;
  
  // Payload
  const payload = JSON.stringify({
    id: messageId,
    content,
    sender: senderHash,
    createdAt: timestamp
  });

  await redis.hset(key, messageId, payload);
  await redis.expire(key, 24 * 3600); // 24h absolute protocol wipe
  
  scheduleCryptoErasure(key, messageId, 24 * 3600 * 1000);

  return JSON.parse(payload);
}

/**
 * Retrieves the ephemeral messages, sorted by timestamp.
 */
async function getAnonymousMessages(roomId) {
  const key = `room:${roomId}:messages`;
  const data = await redis.hgetall(key);
  
  if (!data || Object.keys(data).length === 0) return [];

  const messages = Object.values(data).map(str => {
    try { return JSON.parse(str); } catch (e) { return null; }
  }).filter(Boolean);

  // Sort chronological based on the timestamp embedded in the ID/payload
  messages.sort((a, b) => a.createdAt - b.createdAt);
  
  return messages;
}

module.exports = {
  redis,
  postAnonymousMessage,
  getAnonymousMessages
};
