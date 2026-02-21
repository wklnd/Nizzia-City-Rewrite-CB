// ═══════════════════════════════════════════════════════════════
//  Money Controller — Wallet, transfers, transaction history
// ═══════════════════════════════════════════════════════════════

const moneyService = require('../services/moneyService');

// GET /api/money/wallet
async function wallet(req, res) {
  try {
    const userId = req.authUserId;
    const data = await moneyService.getWallet(userId);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

// POST /api/money/transfer  { recipient, amount }
async function transfer(req, res) {
  try {
    const userId = req.authUserId;
    const { recipient, amount } = req.body;
    if (!recipient) return res.status(400).json({ error: 'Recipient is required' });
    if (!amount)    return res.status(400).json({ error: 'Amount is required' });
    const result = await moneyService.transferMoney(userId, recipient, amount);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /api/money/history?page=1&filter=crime,job
async function history(req, res) {
  try {
    const userId = req.authUserId;
    const { page, filter } = req.query;
    const data = await moneyService.getHistory(userId, page, filter);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { wallet, transfer, history };