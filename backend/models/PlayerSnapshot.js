const mongoose = require('mongoose');

const BattleTotalsSchema = new mongoose.Schema({
  strength: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  dexterity: { type: Number, default: 0 },
  defense: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const PlayerSnapshotSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', index: true, required: true },
  ts: { type: Date, default: Date.now },
  money: { type: Number, default: 0 },
  bankLocked: { type: Number, default: 0 },
  portfolioValue: { type: Number, default: 0 },
  netWorth: { type: Number, default: 0, index: true },
  battleTotals: { type: BattleTotalsSchema, default: () => ({}) },
  workTotal: { type: Number, default: 0 },
});

// TTL: keep snapshots for ~60 days to limit growth
PlayerSnapshotSchema.index({ ts: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
PlayerSnapshotSchema.index({ player: 1, ts: 1 });

module.exports = mongoose.model('PlayerSnapshot', PlayerSnapshotSchema);
