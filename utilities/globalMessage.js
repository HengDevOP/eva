// utils/globalMessageQueue.js
const queue = [];
let isProcessing = false;
const RATE_LIMIT = 5; // messages per second
const INTERVAL = 1000 / RATE_LIMIT;

/**
 * Internal function to process the queue
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const { channel, options, resolve, reject } = queue.shift();

    try {
      const sentMessage = await channel.send(options);
      resolve(sentMessage); // resolve the promise when sent
    } catch (err) {
      reject(err); // reject the promise if error
    }

    await new Promise((r) => setTimeout(r, INTERVAL));
  }

  isProcessing = false;
}

/**
 * Public send function that respects global queue
 * @param {TextChannel|ThreadChannel|DMChannel} channel
 * @param {Object} options - content, embeds, etc.
 * @returns {Promise<Message>}
 */
async function send(channel, options) {
  return new Promise((resolve, reject) => {
    queue.push({ channel, options, resolve, reject });
    processQueue();
  });
}

module.exports = { send };
