const Player = require('../models/Player');
const BankAccount = require('../models/Bank');
const { getCurrentRates, getEndDate, calculatePayout, PERIODS } = require('../services/bankService');

// GET /api/bank/rates
async function rates(req, res) {
  try {
    const data = await getCurrentRates();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// GET /api/bank/accounts
async function listAccounts(req, res) {
  try {
    const userId = req.authUserId;
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const accounts = await BankAccount.find({ player: player._id }).sort({ startDate: -1 }).lean();
    return res.json({ accounts });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

// POST /api/bank/deposit { amount, period }
async function deposit(req, res) {
  try {
    const userId = req.authUserId;
    const { amount, period } = req.body;
    const amt = Math.floor(Number(amount || 0));
    if (!PERIODS[period]) return res.status(400).json({ error: 'Invalid period' });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (amt > 2000000000) return res.status(400).json({ error: 'Max deposit is $2,000,000,000' });

    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if ((player.money || 0) < amt) return res.status(400).json({ error: 'Not enough money' });

  // Enforce only one active investment at a time
  const existingActive = await BankAccount.findOne({ player: player._id, isWithdrawn: false, endDate: { $gt: new Date() } });
  if (existingActive) return res.status(400).json({ error: 'You already have an active investment' });

  const { rates } = await getCurrentRates();
    const apr = Number(rates[period]);
    const startDate = new Date();
    const endDate = getEndDate(startDate, period);

    const acct = new BankAccount({
      player: player._id,
      depositedAmount: amt,
      period,
      interestRate: apr,
      startDate,
      endDate,
    });
    await acct.save();

    player.$locals._txMeta = { type: 'bank_deposit', description: `Bank deposit (${period})` };
    player.money = Number((player.money - amt).toFixed(2));
    await player.save();

    return res.status(201).json({ account: acct.toObject(), money: player.money });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

// POST /api/bank/withdraw { accountId }
async function withdraw(req, res) {
  try {
    const userId = req.authUserId;
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const acct = await BankAccount.findOne({ _id: accountId, player: player._id });
    if (!acct) return res.status(404).json({ error: 'Account not found' });
    if (acct.isWithdrawn) return res.status(400).json({ error: 'Already withdrawn' });
    if (new Date(acct.endDate) > new Date()) return res.status(400).json({ error: 'Deposit is still locked' });

    const { total, interest } = calculatePayout(acct.depositedAmount, acct.interestRate, acct.period);
    acct.isWithdrawn = true;
    await acct.save();
    player.$locals._txMeta = { type: 'bank_withdraw', description: `Bank withdrawal ($${acct.depositedAmount.toLocaleString()} + $${interest.toLocaleString()} interest)` };
    player.money = Number(((player.money || 0) + total).toFixed(2));
    await player.save();
    return res.json({ money: player.money, payout: { principal: acct.depositedAmount, interest, total }, account: acct.toObject() });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

module.exports = { rates, listAccounts, deposit, withdraw };
