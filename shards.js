const { ShardingManager } = require("discord.js");
const path = require("path");
require("dotenv").config();

const manager = new ShardingManager(path.join(__dirname, "bot.js"), {
  totalShards: "auto",
  token: process.env.DISCORD_TOKEN,
});

// Keep track of all shards
const shards = [];

manager.on("shardCreate", (shard) => {
  console.log(`✅ Launched shard ${shard.id}`);
  shards.push(shard);

  shard.on("ready", () => console.log(`Shard ${shard.id} is ready`));

  shard.on("death", () => {
    console.log(`⚠️ Shard ${shard.id} died. Respawning...`);
    shard
      .spawn()
      .then(() => console.log(`♻️ Shard ${shard.id} respawned successfully`))
      .catch((err) =>
        console.error(`Failed to respawn shard ${shard.id}:`, err)
      );
  });

  shard.on("error", (err) => {
    console.error(`Shard ${shard.id} encountered an error:`, err);
  });
});

// Spawn all shards
manager.spawn();

// Export manager and shards list
module.exports = { manager, shards };
