require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const fs = require("fs");
const Topgg = require("@top-gg/sdk");
const { client } = require("./bot");

// load the server profile
const Servers = require("./models/servers");
const giftCodeRoute = require("./public/routes/giftcode");
const plugins = require("./resources/plugins.json");

const botName = "Beetle";

const app = express();
const PORT = process.env.PORT;
// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// Add these lines:
app.use(express.json()); // to parse application/json
app.use(express.urlencoded({ extended: true })); // to parse form data

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;

// Discord scopes
const scopes = ["identify", "guilds"];

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_REDIRECT_URI,
      scope: scopes,
    },
    function (accessToken, refreshToken, profile, done) {
      // profile contains user info + guilds
      return done(null, profile);
    }
  )
);

// Connect to MongoDB first
mongoose.connect(process.env.MONGO_URI, {});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60, // 1 hour
    }),
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      httpOnly: true,
      secure: false, // set true if using HTTPS
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/giftcode", giftCodeRoute);

const contributors = [
  {
    discordId: "749081698443984958",
    position: "Bot Developer",
    star: 5,
  },
  {
    discordId: "1105423793826046002",
    position: "Server Manager",
    star: 5,
  },
];

app.get("/", async (req, res) => {
  let guilds = [
    {
      name: "Chill Zone",
      icon: "https://img.icons8.com/color/512/chat.png",
      memberCount: 48_200,
      inviteURL: "https://discord.gg/chillzone",
    },
    {
      name: "Gamers United",
      icon: "https://img.icons8.com/color/512/joystick.png",
      memberCount: 37_500,
      inviteURL: "https://discord.gg/gamersunited",
    },
    {
      name: "Anime Café",
      icon: "https://img.icons8.com/color/512/ramen-bowl.png",
      memberCount: 29_400,
      inviteURL: "https://discord.gg/animecafe",
    },
    {
      name: "Code Masters",
      icon: "https://img.icons8.com/color/512/source-code.png",
      memberCount: 22_800,
      inviteURL: "https://discord.gg/codemasters",
    },
    {
      name: "Crypto Hangout",
      icon: "https://img.icons8.com/color/512/bitcoin.png",
      memberCount: 18_900,
      inviteURL: "https://discord.gg/cryptohangout",
    },
    {
      name: "Night Owls",
      icon: "https://img.icons8.com/color/512/owl.png",
      memberCount: 44_300,
      inviteURL: "https://discord.gg/nightowls",
    },
    {
      name: "Mobile Gamers Hub",
      icon: "https://img.icons8.com/color/512/smartphone-tablet.png",
      memberCount: 33_700,
      inviteURL: "https://discord.gg/mobilehub",
    },
    {
      name: "Study Together",
      icon: "https://img.icons8.com/color/512/books.png",
      memberCount: 27_100,
      inviteURL: "https://discord.gg/study",
    },
    {
      name: "Art Lounge",
      icon: "https://img.icons8.com/color/512/color-palette.png",
      memberCount: 16_600,
      inviteURL: "https://discord.gg/artlounge",
    },
    {
      name: "Tech Talkers",
      icon: "https://img.icons8.com/color/512/artificial-intelligence.png",
      memberCount: 40_500,
      inviteURL: "https://discord.gg/techtalk",
    },
    {
      name: "Valorant Squad",
      icon: "https://img.icons8.com/color/512/crosshair.png",
      memberCount: 49_900,
      inviteURL: "https://discord.gg/valosquad",
    },
    {
      name: "Music Lounge",
      icon: "https://img.icons8.com/color/512/musical-notes.png",
      memberCount: 23_400,
      inviteURL: "https://discord.gg/musiclounge",
    },
  ];

  const contributorsProfile = await Promise.all(
    contributors.map(async (contri) => {
      try {
        const user = await client.users.fetch(contri.discordId);
        return {
          username: `${user.username}#${user.discriminator}`,
          avatar: user.displayAvatarURL({ dynamic: true, size: 128 }),
          position: contri.position,
          star: contri.star || 5, // default 5 stars if not defined
        };
      } catch (err) {
        console.error(`Could not fetch user with ID ${contri.discordId}:`, err);
      }
    })
  );

  // Shuffle guilds array
  guilds = guilds.sort(() => Math.random() - 0.5);

  res.render("home", {
    botName,
    user: req.user || null,
    guilds,
    contributors: contributorsProfile,
  });
});

// get vote webhook from topgg
const webhook = new Topgg.Webhook("some_secret_value");

const siteKey = "6LfBByAsAAAAACh7_iNJm2YJCJfeDo6tn9Nysi2C";

// verify route with captcha
app.get("/verify", async (req, res) => {
  const { token } = req.query;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord Verification</title>
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">

  <!-- Centered card container -->
  <div class="bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md text-center">
    
    <!-- Title -->
    <h1 class="text-3xl font-bold text-blue-400 mb-4 sm:mb-6">Discord Verification</h1>

    <!-- Subtitle -->
    <p class="text-gray-300 mb-4 sm:mb-6">
      Welcome! Please verify your account to access the server.
    </p>

    <!-- Form -->
    <form action="/verify/confirm" method="POST" class="space-y-6">
      <input type="hidden" name="token" value="${token}" />

      <!-- reCAPTCHA -->
      <div class="g-recaptcha mx-auto mb-4 sm:mb-6" data-sitekey="${siteKey}"></div>

      <!-- Verify Button -->
      <button type="submit" 
        class="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white font-semibold py-3 rounded-xl shadow-md">
        Verify Account
      </button>
    </form>

    <!-- Footer -->
    <p class="text-gray-400 text-sm mt-4 sm:mt-6">
      You have 10 minutes to complete the verification.
    </p>
  </div>

</body>
</html>
`);
});

const verificationToken = require("./models/verificationToken");
app.post(
  "/verify/confirm",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    const { token } = req.body;
    const captcha = req.body["g-recaptcha-response"];

    // Helper function to render verification page with error
    const renderPage = (errorMessage = "") => {
      return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Discord Verification</title>
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">
        <div class="bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md text-center">
          <h1 class="text-3xl font-bold text-blue-400 mb-4 sm:mb-6">Discord Verification</h1>
          <p class="text-gray-300 mb-4 sm:mb-6">Welcome! Please verify your account to access the server.</p>
          <form action="/verify/confirm" method="POST" class="space-y-4">
            <input type="hidden" name="token" value="${token}" />
            <div class="g-recaptcha mx-auto" data-sitekey="${siteKey}"></div>
            ${
              errorMessage
                ? `<p class="text-red-500 text-sm mt-2">${errorMessage}</p>`
                : ""
            }
            <button type="submit" 
              class="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white font-semibold py-3 rounded-xl shadow-md">
              Verify Account
            </button>
          </form>
          <p class="text-gray-400 text-sm mt-4 sm:mt-6">You have 10 minutes to complete the verification.</p>
        </div>
      </body>
      </html>
      `;
    };

    // Check captcha
    if (!captcha) return res.send(renderPage("Captcha required!"));

    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`;
    const googleVerify = await fetch(verifyURL).then((r) => r.json());

    if (!googleVerify.success)
      return res.send(renderPage("Captcha verification failed!"));

    // Check token validity
    const data = await verificationToken.findOne({ secretToken: token });
    if (!data)
      return res.send(renderPage("Invalid or expired verification token."));
    if (data.expiredAt < Date.now())
      return res.send(renderPage("Verification token has expired."));

    const { userId, guildId } = data;
    const guild = client.guilds.cache.get(guildId);
    console.log(guild);
    if (guild) {
      const member = guild.members.cache.get(userId);
      if (member) {
        const role = guild.roles.cache.find(
          (r) => r.id === "1412429607197610118"
        ); // Change to your role
        if (role) {
          await member.roles.add(role);
          console.log(
            `✅ Verified user ${member.user.tag} in guild ${guild.name}`
          );
        }
      }
    }

    // Delete token to prevent reuse
    await verificationToken.deleteOne({ secretToken: token });

    // Render full screen success message
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Success</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 flex items-center justify-center min-h-screen">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-green-500 mb-6">Verification Successful</h1>
        <p class="text-gray-300 text-xl">You may now return to Discord.</p>
      </div>
    </body>
    </html>
    `);
  }
);

app.post(
  "/dblwebhook",
  webhook.listener(async (vote) => {
    try {
      console.log("Vote received from user:", vote.user);

      // send logging message into the main server channel
      const channel = client.channels.cache.get("1428951777302020096");

      if (channel) {
        try {
          // Get user from cache; fetch from API if not cached
          let user = client.users.cache.get(vote.user);
          if (!user)
            user = await client.users.fetch(vote.user).catch(() => null);

          if (!user) {
            console.error(`Could not fetch user with ID ${vote.user}`);
            return;
          }

          const avatarURL = user.displayAvatarURL({ dynamic: true, size: 256 });

          const embed = new EmbedBuilder()
            .setTitle("Upvote from TOPGG")
            .setThumbnail(avatarURL)
            .setDescription(
              `**User:** ${user.username}#${user.discriminator} (\`${user.id}\`)\n` +
                `**Type:** ${vote.isWeekend ? "Weekend Vote" : "Regular Vote"}`
            )
            .setColor("Green")
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        } catch (err) {
          console.error("Could not send vote log message:", err);
        }
      }

      // Loop through all guilds
      const guilds = client.guilds.cache.filter((g) => g.ownerId === vote.user);

      if (guilds.size === 0) {
        console.log("No servers owned by this user.");
        return;
      }

      for (const guild of guilds.values()) {
        // Find server in MongoDB
        const serverData = await Servers.findOne({ serverId: guild.id });
        if (!serverData) continue;

        // Ensure premium object exists
        if (!serverData.premium) serverData.premium = {};

        const now = new Date();
        const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in ms

        if (
          !serverData.premium.expiresAt ||
          serverData.premium.expiresAt < now
        ) {
          // If expired or not set → start from now
          serverData.premium.expiresAt = new Date(now.getTime() + twelveHours);
        } else {
          // If still active → extend from current expiresAt
          serverData.premium.expiresAt = new Date(
            serverData.premium.expiresAt.getTime() + twelveHours
          );
        }

        await serverData.save();

        console.log(
          `Upgraded premium for server "${
            guild.name
          }" until ${serverData.premium.expiresAt.toLocaleString()}`
        );
      }
    } catch (err) {
      console.error("Error processing vote webhook:", err);
    }
  })
);

// Pricing route
app.get("/pricing", (req, res) => {
  // Render pricing.ejs and pass variables
  res.render("pricing", {
    botName,
    user: req.user || null, // Logged-in user, if using Discord OAuth
  });
});

app.get("/docs", (req, res) => {
  const pages = [
    { id: "moderation", label: "Moderation", file: "moderation.html" },
    { id: "economy", label: "Economy", file: "economy.html" },
    { id: "giveaway", label: "Giveaway", file: "giveaway.html" },
    { id: "automation", label: "Automation", file: "automation.html" },
  ];

  res.redirect(`/docs/${pages[0].id}`);
});

app.get("/docs/:page", (req, res) => {
  const pages = [
    { id: "moderation", label: "Moderation", file: "moderation.html" },
    { id: "economy", label: "Economy", file: "economy.html" },
    { id: "giveaway", label: "Giveaway", file: "giveaway.html" },
    { id: "automation", label: "Automation", file: "automation.html" },
  ];

  res.render("docs", {
    pages,
    botName: "Beetle Docs",
    user: req.user,
  });
});

const GiftCode = require("./models/giftcode");
const { EmbedBuilder } = require("discord.js");
app.get("/mygiftcode", async (req, res) => {
  // Redirect to login if user is not authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/auth/discord");
  }

  try {
    const userId = req.user.id; // Discord user ID

    // Fetch gift codes purchased by this user
    const myGiftCodes = await GiftCode.find({ purchaserId: userId }).sort({
      purchasedAt: -1,
    });

    // Render the EJS template
    res.render("mygiftcode", {
      botName: "Beetle GiftCode",
      user: req.user,
      giftCodes: myGiftCodes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/auth/discord", passport.authenticate("discord"));

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  async (req, res) => {
    res.redirect("/");
  }
);

app.get("/terms-of-service", (req, res) => {
  res.render("terms-of-service", {
    botName: "Beetle Bot",
    user: req.user || null,
  });
});

// PROFILE ROUTES PAGE
app.get("/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/auth/discord");

  // Count user's gift codes
  const totalGiftCodes = await GiftCode.countDocuments({
    purchaserId: req.user.id,
  });

  const guildsManagedCount = req.user.guildsManaged?.length || 0;

  res.render("profile", {
    botName,
    user: req.user,
    guildsManagedCount,
    totalGiftCodes,
  });
});
app.get("/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/auth/discord");

  // ✅ 1. Filter only guilds where the user is the owner
  const ownedGuilds = req.user.guilds.filter((guild) => guild.owner);

  // ✅ 2. Fetch all existing server profiles from DB
  const allServers = await Servers.find({});

  // ✅ 3. Map guilds to include bot presence, premium, opacity, and invite URL
  const guilds = ownedGuilds.map((guild) => {
    const serverProfile = allServers.find((s) => s.serverId === guild.id);

    const addBotUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&redirect_uri=${process.env.REDIRECT_URL}&response_type=code`;
    let expiresAt = serverProfile?.premium?.expiresAt || null;
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.memberCount || 0,
      botInGuild: !!serverProfile, // true if profile exists
      opacity: serverProfile ? 1 : 0.5, // full or half opacity
      premiumExpiresAt: expiresAt, // actual timestamp or null
      premiumActive: expiresAt && expiresAt > Date.now(), // true if premium is still active
      addBotUrl,
    };
  });

  // ✅ 4. Sort: servers with bot first, then without bot
  guilds.sort((a, b) => b.botInGuild - a.botInGuild);

  // ✅ 5. Render dashboard
  res.render("dashboard", {
    user: req.user,
    botName: "Bettle Bot",
    userName: req.user.username,
    guilds,
    serverCount: guilds.length,
    commandsUsed: 0,
  });
});
app.get("/dashboard/:guildId", async (req, res) => {
  // Make sure user is logged in
  if (!req.isAuthenticated()) return res.redirect("/");

  try {
    const guildId = req.params.guildId;

    // Get guild from Discord cache
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.render("authorize", { botName });

    // Get guild data from your database
    const guildData = (await Servers.findOne({ serverId: guildId })) || {};

    // Prepare data for EJS
    const renderGuild = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      premium: guildData.premium || { isEnable: false, expiresAt: null },
    };

    res.render("dashboardPage", {
      guild: renderGuild,
      botName,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

app.get("/dashboard/:guildId/welcomer", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/");
  res.render("features/welcomer", { botName, user: req.user });
});

// GET redeem page
app.get("/dashboard/:guildId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/");

  try {
    const guildId = req.params.guildId;

    // Get guild from Discord cache
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.render("authorize", { botName });

    // Get guild data from database
    const guildData = (await Servers.findOne({ serverId: guildId })) || {};

    // Prepare data for EJS
    const renderGuild = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      premium: guildData.premium || { isEnable: false, expiresAt: null },
    };

    res.render("redeem", { guild: renderGuild, botName, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

// POST redeem code
app.post("/dashboard/:guildId/redeem", async (req, res) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const guildId = req.params.guildId;
  const code = req.body.code?.replace(/-/g, "").toUpperCase();

  if (!code) {
    return res.json({ success: false, message: "Please enter a code." });
  }

  try {
    const guildData = await Servers.findOne({ serverId: guildId });
    if (!guildData) {
      return res.json({ success: false, message: "Guild not found." });
    }

    const validCode = await GiftCode.findOne({ code });

    if (!validCode) {
      return res.json({
        success: false,
        message: "Invalid code or already redeemed.",
      });
    }

    const now = Date.now();
    const extraTime = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // Check if existing premium is active
    if (
      guildData.premium?.isEnable &&
      guildData.premium?.expiresAt &&
      new Date(guildData.premium.expiresAt) > now
    ) {
      // Extend from current expiration
      guildData.premium.expiresAt = new Date(
        new Date(guildData.premium.expiresAt).getTime() + extraTime
      );
    } else {
      // Start new premium from now
      guildData.premium = {
        isEnable: true,
        expiresAt: new Date(now + extraTime),
      };
    }

    await guildData.save();

    // ✅ Delete the redeemed code
    await GiftCode.deleteOne({ code }); // pass the code as filter

    return res.json({
      success: true,
      message: `Code redeemed successfully. Do not refresh you will redirect to dashboard.`,
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Something went wrong." });
  }
});

app.get("/plugins", async (req, res) => {
  try {
    // Map plugin info
    const pluginStats = plugins.map((pluginInfo) => ({
      name: pluginInfo.name,
      slug: pluginInfo.slug,
      image: pluginInfo.image,
      shortDescription: pluginInfo.shortDescription,
      tags: pluginInfo.tags,
      premium: pluginInfo.premium,
      count: 0,
    }));

    // Aggregate plugin enabled counts safely
    const aggregation = await Servers.aggregate([
      {
        $match: { plugins: { $exists: true, $type: "object" } }, // ✅ ensure plugins exist
      },
      { $replaceRoot: { newRoot: "$plugins" } },
      {
        $group: pluginStats.reduce(
          (acc, p) => {
            acc._id = null;
            acc[p.slug] = { $sum: { $cond: [`$${p.slug}.enabled`, 1, 0] } };
            return acc;
          },
          { _id: null }
        ),
      },
    ]);

    if (aggregation.length) {
      const counts = aggregation[0];
      pluginStats.forEach((p) => {
        if (counts[p.slug] !== undefined) p.count = counts[p.slug];
      });
    }

    // ✅ Sort by most enabled count (descending)
    pluginStats.sort((a, b) => b.count - a.count);

    res.render("plugins", {
      botName: "Beetle Plugins",
      plugins: pluginStats,
      user: req.user,
    });
  } catch (error) {
    console.error("Error loading plugins:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to show individual plugin details
app.get("/plugins/:pluginSlug", (req, res) => {
  const slug = req.params.pluginSlug;

  const plugin = plugins.find((p) => p.slug === slug);
  if (!plugin) {
    return res.render("plugin-404", {
      botName: "Beetle Plugins",
      user: req.user,
    });
  }

  // Load JSON file
  const filePath = path.join(__dirname, "./public/pluginData", `${slug}.json`);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (!err && data) {
      try {
        const commands = JSON.parse(data);

        // Split commands: Admin vs Everyone
        plugin.adminCommands = commands.filter(
          (c) => c.usage.toLowerCase() === "admin"
        );
        plugin.everyoneCommands = commands.filter(
          (c) => c.usage.toLowerCase() !== "admin"
        );
      } catch (e) {
        plugin.adminCommands = [];
        plugin.everyoneCommands = [];
      }
    } else {
      plugin.adminCommands = [];
      plugin.everyoneCommands = [];
    }

    res.render("plugin-detail", {
      botName: "Beetle Plugins",
      plugin,
      user: req.user,
    });
  });
});

app.post("/webhook", (req, res) => {
  console.log(req.body);
  res.send("OK");
});

app.get("/commands", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  function loadCommands(baseDir = path.join(__dirname, "/public/help")) {
    const commandsByCategory = {};

    // Read all JSON files directly inside help folder
    const commandFiles = fs
      .readdirSync(baseDir)
      .filter((file) => file.endsWith(".json"));

    for (const file of commandFiles) {
      const filePath = path.join(baseDir, file);
      const commandData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      // Use filename (without .json) as the category name
      const category = path.basename(file, ".json");
      commandsByCategory[category] = commandData;
    }

    return commandsByCategory;
  }

  // Example usage
  const commandsByCategory = loadCommands();
  console.log(commandsByCategory);

  // Sort categories A-Z
  let sortedCategories = Object.keys(commandsByCategory)
    .sort((a, b) => a.localeCompare(b)) // alphabetically
    .reduce((obj, key) => {
      obj[key] = commandsByCategory[key];
      return obj;
    }, {});
  res.render("commands", {
    botName: "Beetle Bot",
    commandsByCategory: sortedCategories,
  });
});

// Route to render all guilds
app.get("/servers", async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).send("Bot is not ready yet");
    }

    // Map through guilds cache and process invites asynchronously
    const guilds = await Promise.all(
      client.guilds.cache.map(async (guild) => {
        let inviteURL = null;

        try {
          // Prefer system channel, fallback to first text channel with invite permissions
          const channel =
            guild.systemChannel ||
            guild.channels.cache.find(
              (ch) =>
                ch.isTextBased() &&
                ch.permissionsFor(guild.members.me).has("CreateInstantInvite")
            );

          if (channel) {
            // Create an invite with unlimited uses and no expiration
            const invite = await channel.createInvite({
              maxAge: 0, // never expire
              maxUses: 0, // unlimited
              unique: false,
            });

            inviteURL = `https://discord.gg/${invite.code}`;
          }
        } catch (err) {
          console.warn(
            `❌ Could not create invite for guild "${guild.name}": ${err.message}`
          );
        }

        return {
          id: guild.id,
          name: guild.name,
          icon:
            guild.iconURL({ dynamic: true, size: 128 }) ||
            `https://cdn.discordapp.com/embed/avatars/${Math.floor(
              Math.random() * 5
            )}.png`,
          memberCount: guild.memberCount,
          description: guild.description || "No description provided",
          invite: inviteURL, // may be null
        };
      })
    );

    // Sort guilds by member count descending for nicer display
    guilds.sort((a, b) => b.memberCount - a.memberCount);

    // Render EJS template
    res.render("servers", { guilds, botName, user: req.user });
  } catch (error) {
    console.error("Error rendering guilds:", error);
    res.status(500).send("Something went wrong");
  }
});

app.get("/coming-soon", (req, res) => {
  res.render("coming-soon", {
    botName: "Bettle Bot",
  });
});

// Premium page
app.get("/premium", (req, res) => {
  res.render("premium", { botName: "Bettle Bot", user: req.user || null });
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect("/");
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
