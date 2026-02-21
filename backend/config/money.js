// ═══════════════════════════════════════════════════════════════
//  Money Config — Transfer limits, daily caps
// ═══════════════════════════════════════════════════════════════

const TRANSFER_FEE_RATE     = 0;              // 0% — free transfers
const TRANSFER_DAILY_CAP    = 2_000_000_000;  // $2B per day
const TRANSFER_MIN          = 1;              // minimum transfer amount
const TRANSACTION_PAGE_SIZE = 50;             // records per page in history

module.exports = {
  TRANSFER_FEE_RATE,
  TRANSFER_DAILY_CAP,
  TRANSFER_MIN,
  TRANSACTION_PAGE_SIZE,
};
