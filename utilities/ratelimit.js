const messageQueue = [];
let isProcessingQueue = false;

// Global rate limit
let globalMessageCount = 0;
const GLOBAL_LIMIT = 5; // max messages per second
const GLOBAL_INTERVAL = 1000; // 1 second

// Reset the counter every interval
setInterval(() => {
  globalMessageCount = 0;
}, GLOBAL_INTERVAL);

// User cache: store fetched users to avoid multiple fetches
const userCache = new Map();

// ✅ Import client correctly
const { client } = require("../bot"); // Make sure this exports your Discord.Client instance

function queueMessage(userId, content) {
  messageQueue.push({ userId, content });
  processQueue();
}

function checkGlobalRateLimit() {
  if (globalMessageCount >= GLOBAL_LIMIT) return false;
  globalMessageCount++;
  return true;
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    if (!checkGlobalRateLimit()) {
      await new Promise((res) => setTimeout(res, 200)); // Wait and retry
      continue;
    }

    const { userId, content } = messageQueue.shift();

    try {
      let user = userCache.get(userId);

      if (!user) {
        user = await client.users.fetch(userId).catch(() => null);
        if (user) userCache.set(userId, user);
      }

      if (user) {
        await user.send(content);
        console.log(`📨 Sent message to ${userId}`);
      } else {
        console.warn(`⚠️ User ${userId} not found.`);
      }
    } catch (err) {
      console.error(`❌ Queue send failed to ${userId}:`, err);
    }
  }

  isProcessingQueue = false;
}

module.exports = { queueMessage };
