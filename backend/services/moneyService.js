// ═══════════════════════════════════════════════════════════════
//  Money Service — Transfers, balance, transaction logging
// ═══════════════════════════════════════════════════════════════

const Player      = require('../models/Player');
const Transaction = require('../models/Transaction');
const {
  TRANSFER_FEE_RATE,
  TRANSFER_DAILY_CAP,
  TRANSFER_MIN,
  TRANSACTION_PAGE_SIZE,
} = require('../config/money');

// ── Helpers ──

async function resolvePlayerByUser(userId) {
  if (!userId) throw Object.assign(new Error('Missing userId'), { status: 400 });
  const player = await Player.findOne({ user: userId });
  if (!player) throw Object.assign(new Error('Player not found'), { status: 404 });
  return player;
}

/** Flexible player lookup: accepts ObjectId (user field) or numeric player id */
async function resolvePlayerFlexible(identifier) {
  if (!identifier) throw Object.assign(new Error('Missing player identifier'), { status: 400 });
  const n = Number(identifier);
  if (!Number.isNaN(n) && Number.isFinite(n)) {
    const p = await Player.findOne({ id: n });
    if (p) return p;
  }
  const p = await Player.findOne({ user: identifier });
  if (!p) throw Object.assign(new Error('Player not found'), { status: 404 });
  return p;
}

// ── Log a transaction (called from anywhere in the codebase) ──

async function logTransaction(playerId, type, amount, description = '', opts = {}) {
  const player = await Player.findById(playerId);
  const balanceAfter = player ? player.money : 0;
  return Transaction.create({
    player: playerId,
    type,
    amount,
    balanceAfter,
    description,
    otherPlayer: opts.otherPlayer || null,
    meta: opts.meta || {},
  });
}

// ── Get wallet overview ──

async function getWallet(userId) {
  const player = await resolvePlayerByUser(userId);

  // Fetch today's outgoing transfer total
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaysTransfers = await Transaction.aggregate([
    {
      $match: {
        player: player._id,
        type: 'transfer_out',
        createdAt: { $gte: startOfDay },
      },
    },
    { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
  ]);
  const dailySent = todaysTransfers[0]?.total || 0;

  // Quick income/expense stats for last 24h
  const last24h = new Date(Date.now() - 86400000);
  const stats24h = await Transaction.aggregate([
    { $match: { player: player._id, createdAt: { $gte: last24h } } },
    {
      $group: {
        _id: null,
        income: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
        expenses: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } },
        txCount: { $sum: 1 },
      },
    },
  ]);

  return {
    balance: player.money,
    playerName: player.name,
    playerId: player.id,
    dailySent,
    dailyCap: TRANSFER_DAILY_CAP,
    dailyRemaining: Math.max(0, TRANSFER_DAILY_CAP - dailySent),
    income24h: stats24h[0]?.income || 0,
    expenses24h: stats24h[0]?.expenses || 0,
    txCount24h: stats24h[0]?.txCount || 0,
  };
}

// ── Transfer money to another player ──

async function transferMoney(senderUserId, recipientIdentifier, amount) {
  amount = Math.floor(Number(amount) || 0);
  if (amount < TRANSFER_MIN) {
    throw Object.assign(new Error(`Minimum transfer is $${TRANSFER_MIN.toLocaleString()}`), { status: 400 });
  }

  const sender = await resolvePlayerByUser(senderUserId);
  const recipient = await resolvePlayerFlexible(recipientIdentifier);

  if (sender._id.toString() === recipient._id.toString()) {
    throw Object.assign(new Error('You can\'t transfer money to yourself'), { status: 400 });
  }

  // Check balance
  if (sender.money < amount) {
    throw Object.assign(new Error('Not enough cash'), { status: 400 });
  }

  // Check daily cap
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysTransfers = await Transaction.aggregate([
    {
      $match: {
        player: sender._id,
        type: 'transfer_out',
        createdAt: { $gte: startOfDay },
      },
    },
    { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
  ]);
  const dailySent = todaysTransfers[0]?.total || 0;

  if (dailySent + amount > TRANSFER_DAILY_CAP) {
    const remaining = Math.max(0, TRANSFER_DAILY_CAP - dailySent);
    throw Object.assign(
      new Error(`Daily transfer limit reached. You can still send $${remaining.toLocaleString()} today.`),
      { status: 400 },
    );
  }

  // Calculate fee
  const fee = Math.floor(amount * TRANSFER_FEE_RATE);
  const received = amount - fee;

  // Execute transfer
  sender.money = Number(sender.money) - amount;
  recipient.money = Number(recipient.money) + received;
  // Flag to prevent double-logging (we create our own Transaction records below)
  sender.$locals._skipAutoLog = true;
  recipient.$locals._skipAutoLog = true;
  await Promise.all([sender.save(), recipient.save()]);

  // Log both sides
  await Promise.all([
    Transaction.create({
      player: sender._id,
      type: 'transfer_out',
      amount: -amount,
      balanceAfter: sender.money,
      description: `Sent $${amount.toLocaleString()} to ${recipient.name}`,
      otherPlayer: recipient._id,
      meta: { fee, received, recipientId: recipient.id },
    }),
    Transaction.create({
      player: recipient._id,
      type: 'transfer_in',
      amount: received,
      balanceAfter: recipient.money,
      description: `Received $${received.toLocaleString()} from ${sender.name}`,
      otherPlayer: sender._id,
      meta: { fee, senderId: sender.id },
    }),
  ]);

  return {
    sent: amount,
    fee,
    received,
    senderBalance: sender.money,
    recipientName: recipient.name,
    recipientId: recipient.id,
  };
}

// ── Transaction history (paginated) ──

async function getHistory(userId, page = 1, filter = null) {
  const player = await resolvePlayerByUser(userId);
  const pageNum = Math.max(1, Math.floor(Number(page) || 1));
  const limit = TRANSACTION_PAGE_SIZE;
  const skip = (pageNum - 1) * limit;

  const query = { player: player._id };
  if (filter && filter !== 'all') {
    // Allow comma-separated types: "crime,job" or a single type
    const types = filter.split(',').map(t => t.trim()).filter(Boolean);
    if (types.length) query.type = { $in: types };
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return {
    transactions,
    page: pageNum,
    totalPages: Math.ceil(total / limit) || 1,
    totalRecords: total,
  };
}

module.exports = {
  logTransaction,
  getWallet,
  transferMoney,
  getHistory,
  resolvePlayerByUser,
};
