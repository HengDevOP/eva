const mongoose = require("mongoose");

const serverSchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
    unique: true,
  },
  premium: {
    isEnable: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null }, // null = lifetime premium
  },
  trial: {
    isActivated: { type: Boolean, default: false },
  },
  prefix: {
    type: String,
    default: null,
  },
  serverMemberCount: {
    type: Number,
    default: 0,
  },

  automod: {
    mention: {
      enabled: { type: Boolean, default: false },
      maxMentions: { type: Number, default: 2 },
      frame: { type: Number, default: 10000 }, // 10 seconds
      action: { type: String, default: "timeout" },
      duration: { type: Number, default: 10 * 60 * 1000 }, // 10 minutes in ms
    },
  },

  // moderation logs
  modLogs: {
    isEnable: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    cases: { type: Number, default: 0 },
  },

  antiSpam: {
    isEnable: { type: Boolean, default: false },
    action: { type: String, default: "warn" }, // warn, kick, ban, mute
    maxMessages: { type: Number, default: 3 }, // how many messages
    interval: { type: Number, default: 5000 }, // time frame (ms)
    duplicateCheck: { type: Boolean, default: true },
    maxMentions: { type: Number, default: 5 },
    messages: { type: String, default: null }, // custom warn message
  },

  antiRaid: {
    isEnable: { type: Boolean, default: false },
    action: { type: String, default: "none" }, // none, warn, kick, ban
    messages: { type: String, default: null },
  },

  // feature wordguard
  wordguard: {
    isEnable: { type: Boolean, default: false },
    action: {
      type: String,
      default: "warn",
    },
    blacklist: [],
    punishmentDuration: { type: Number, default: 10 }, // default by 10 minutes
  },

  // verification features
  verification: {
    enabled: { type: Boolean, default: false },
    roles: [{ type: String, default: null }],
    channelId: { type: String }, // Optional channel for verify message
    messageId: { type: String }, // To track verification message
  },
  // tempban features
  tempbans: [
    {
      userId: { type: String, default: null },
      reason: { type: String, default: null },
      unbanTs: { type: Date, default: null },
    },
  ],

  // level system
  level: {
    enabled: { type: Boolean, default: false },
    whiteListChannels: [{ type: String }],
    blacklistChannels: [{ type: String }],
    minXp: { type: Number, default: 15 }, // minimum xp per message
    maxXp: { type: Number, default: 25 }, // maximum xp per message
    cooldown: { type: Number, default: 5 }, // in seconds

    // VOICE CONFIG
    inVoice: { type: Boolean, default: false },
    voiceXP: { type: Number, default: 10 }, // XP per interval
    voiceInterval: { type: Number, default: 60 }, // seconds per XP tick

    levelUpMessages: { type: Boolean, default: true },
    levelUpChannel: { type: String, default: null }, // channel to send level up messages
    levelRewards: [
      {
        level: { type: Number, required: true },
        roleId: { type: String, required: true },
      },
    ],
  },
  // invite tracker feature
  inviteTracker: {
    invites: [
      {
        code: { type: String, default: null },
        uses: { type: Number, default: null },
      },
    ],
    isEnable: { type: Boolean, default: false },
    channelId: { type: String, default: null },
  },

  // warning features
  warnings: {
    maxWarnings: { type: Number, default: 3 }, // default maximum warning up to 3 times
    action: { type: String, default: "ban" }, // ban, timeout, kick
    messages: { type: String, default: null },
    members: [
      {
        userId: { type: String, default: null },
        moderatorId: { type: String, default: null },
        reason: { type: String, default: null },
      },
    ],
  },

  // count feature
  counting: [
    {
      channelId: { type: String, default: null },
      count: { type: Number, default: 0 },
    },
  ],

  // serverStats features
  serverStats: {},

  // ticket feature
  tickets: {
    isEnable: { type: Boolean, default: false },
    ticketPanel: { type: String, default: null }, // refer to the main ticket message
    claimRoles: [],
    pendingTicketCategory: { type: String, default: null },
    activeTicketCategory: { type: String, default: null },
    closedTicketCategory: { type: String, default: null },
    users: [
      {
        channelId: { type: String, default: null },
        createdBy: { type: String, required: true },
        claimBy: { type: String, default: null },
        ticketId: { type: String, required: true }, // this refer to channelId
        status: { type: String, default: "pending" },
        createdAt: { type: Date, default: Date.now },
        closedAt: { type: Date, default: null },
      },
    ],

    //transcript channel
    transcriptChannel: { type: String, default: null },
    // custom messages
    onCreateMessage: { type: String, default: null },
    onClaimMessage: { type: String, default: null },
    onCloseMessage: { type: String, default: null },
    onDeleteMessage: { type: String, default: null },
  },

  // emotional fun commands footer branding removal
  funCommands: {
    isEnable: { type: Boolean, default: false },
    customMessages: [
      {
        content: { type: String, default: null },
      },
    ],
  },

  plugins: {
    beg: {
      enabled: { type: Boolean, default: false },
      cooldown: { type: Number, default: 60 },
      data: [
        {
          id: { type: String, required: true },
          lastBeg: { type: Number, default: null },
        },
      ],
    },
    roleShop: {
      enabled: { type: Boolean, default: false },
      shop: [
        {
          roleId: { type: String, required: true },
          price: { type: Number, required: true },
          stock: { type: Number, default: null }, // null means infinite stock
        },
      ],
    },
    // casino online
    casino: {
      enabled: { type: Boolean, default: false },
      accounts: [
        {
          id: { type: String, required: true },
          coins: { type: Number, default: 0 },
        },
      ],
    },

    blackjack: {
      enabled: { type: Boolean, default: false },
      minBet: { type: Number, default: 1 },
      maxBet: { type: Number, default: 250000 },
      cooldown: { type: Number, default: 10 }, // 10 seconds of cooldown
    },
    // feature wordguard
    nameguard: {
      enabled: { type: Boolean, default: false },
      action: {
        type: String,
        default: "kick",
      },
      blacklist: [{ type: String }],
      message: { type: String },
    },
    // anti-featuress
    linkProtection: {
      enabled: { type: Boolean, default: false },
      allowedChannels: [{ type: String }],
      allowedLink: [{ type: String }],
      message: { type: String, default: null },
    },
    moderation: {
      enabled: { type: Boolean, default: false },
      channel: { type: String },
    },
    // greeting
    greeting: {
      enabled: { type: Boolean, default: false },
      channel: { type: String, default: null },
      messageContent: { type: String, default: null },
      isEmbed: { type: Boolean, default: false },
      embed: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        thumbnail: { type: String, default: null },
        images: { type: String, default: null },
        footer: { type: String, default: null },
        color: { type: String, default: null },
      },
    },

    // farewell
    farewell: {
      enabled: { type: Boolean, default: false },
      channel: { type: String, default: null },
      messageContent: { type: String, default: null },
      isEmbed: { type: Boolean, default: false },
      embed: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        thumbnail: { type: String, default: null },
        images: { type: String, default: null },
        footer: { type: String, default: null },
        color: { type: String, default: null },
      },
    },

    // donation
    donation: {
      enabled: { type: Boolean, default: false },
      customMessage: { type: String, default: null },
      channel: { type: String, default: null },
    },

    // coinflip
    coinflip: {
      fee: { type: Number, default: 0 },
      enabled: { type: Boolean, default: false },
      historyBank: { type: Number, default: null },
      bank: { type: Number, default: null },
      isCurency: { type: Boolean, default: true },
      cooldown: { type: String, default: 5 }, // 5 seconds of cooldown
      minBet: { type: Number, default: 1 },
      maxBet: { type: Number, default: 250000 },
    },
    economy: {
      enabled: { type: Boolean, default: false },
      theme: { type: String, default: "classic" },
      bgURL: { type: String, default: null },
      icon: { type: String, default: "💰" },
      customMessage: { type: String, default: null },
      defaultBalance: { type: Number, default: 500 }, // default start currency at 500 coins
      members: [
        {
          id: { type: String, required: true },
          status: {
            ban: { type: Boolean, default: false },
            reason: { type: String },
            expireAt: { type: Date },
          },
          mainBalance: { type: Number },
          bankBalance: { type: Number, default: 0 },
        },
      ],
    },
    luckydraw: {
      enabled: { type: Boolean, default: false },
      winnerRate: { type: Number, default: 70 }, // assume for 70% of payout
      maxPrice: { type: Number, default: 250000 },
      tickets: [
        {
          id: { type: String, required: true },
          number: { type: Number, required: true },
          betAmount: { type: Number, required: true },
        },
      ],
    },

    payroll: {
      enabled: { type: Boolean, default: false },
      channel: { type: String, default: null },
      roles: [
        {
          roleId: { type: String, default: null },
          payAmount: { type: Number, default: null },
          nextPay: { type: Number, default: null },
        },
      ],
    },
    fishing: {
      enabled: { type: Boolean, default: false },
      cooldown: { type: Number, default: 10 },
      rodBroken: { type: Number, default: 10 }, // handle broke fishing rod for 10%
      rodPrice: { type: Number, default: 250 },
      rodIcon: { type: String, default: null },
      loots: [
        {
          uid: { type: Number, required: true },
          name: { type: String, required: true },
          type: { type: String, default: null },
          icon: { type: String, default: null },
          description: { type: String, default: null },
          catchRate: { type: Number, required: true },
          price: { type: Number, required: true },
        },
      ],
      members: [
        {
          id: { type: String, required: true },
          isFish: { type: Boolean, default: true },
          canFish: { type: Boolean, default: true },
          cooldown: { type: Number, default: null },
          inventory: [
            {
              uid: { type: Number, required: true },
              amount: { type: Number },
            },
          ],
        },
      ],
    },
    farming: {
      enabled: { type: Boolean, default: false },
      cooldown: { type: Number, default: 5000 }, // handler for 5 seconds of cooling down
      shop: [
        {
          uid: { type: Number, required: true },
          name: { type: String },
          icon: { type: String },
          type: { type: String },
          description: { type: String },
          isPurchase: { type: Boolean },
          buyPrice: { type: Number },
          sellPrice: { type: Number },
          ready: { type: Number }, // handle for minutes
        },
      ],
      farming: [
        {
          uid: { type: String, required: true },
          enabled: { type: Boolean, default: true },
          land: [
            {
              uid: { type: Number, required: true },
              ready: { type: Date },
            },
          ],
          inventory: [
            {
              uid: { type: Number, required: true },
              amount: { type: Number },
            },
          ],
        },
      ],
    },

    leveling: {
      enabled: { type: Boolean, default: false },
      channel: { type: String, default: null },

      // Server-wide settings for EXP
      settings: {
        baseExp: { type: Number, default: 10 }, // default exp per message
        lengthFactor: { type: Boolean, default: true }, // if true, scales exp by message length
        maxExpPerMsg: { type: Number, default: 50 }, // prevent spam EXP
        cooldown: { type: Number, default: 60 }, // seconds between exp gain
      },

      // Player data
      levelData: [
        {
          id: { type: String, required: true },
          level: { type: Number, default: 1 },
          exp: { type: Number, default: 0 },
          cooldown: { type: Number },
        },
      ],
    },

    huntingmaster: {
      enabled: { type: Boolean, default: false },
      cooldown: { type: Number, default: 15 },
      weapons: [],
      rarityRates: [
        {
          type: { type: String, required: true }, // common, uncommon, rare, epic, legendary
          rate: { type: Number, required: true },
        },
      ],
      animals: [
        {
          uid: { type: Number, required: true },
          name: { type: String, required: true },
          icon: { type: String, default: null },
          rarity: { type: String, required: true }, // common, uncommon, rare, epic, legendary
        },
      ],
      members: [
        {
          uid: { type: String },
          zoo: [
            {
              id: { type: Number, required: true },
              amount: { type: Number },
            },
          ],
        },
      ],
    },

    callme: {
      enabled: { type: Boolean, default: false },
      channel: { type: String, default: null },
      webhookId: { type: String, default: null },
    },

    response: {
      enabled: { type: Boolean, default: false },
      data: [
        {
          phrase: { type: String, required: true },
          trigger: { type: Number, required: true }, //
          content: { type: String, required: true },
        },
      ],
    },
  },
});

module.exports = mongoose.model("Server", serverSchema);
