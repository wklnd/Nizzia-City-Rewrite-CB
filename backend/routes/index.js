// Centralized route mounting to keep app.js lean and consistent

const itemRoutes = require('./itemRoutes');
const authRoutes = require('./authRoutes');
const playerRoutes = require('./playerRoutes');
const crimeRoutes = require('./crimeRoutes');
const casinoRoutes = require('./casinoRoutes');
const gymRoutes = require('./gymRoutes');
const moneyRoutes = require('./moneyRoutes');
const jobRoutes = require('./jobRoutes');
const devRoutes = require('./devRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const stockRoutes = require('./stockRoutes');

function mountRoutes(app) {
  app.use('/api/items', itemRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/player', playerRoutes);
  // Crime routes currently disabled in original app.js; keep behavior unchanged
  // app.use('/api/crime', crimeRoutes);
  app.use('/api/gym', gymRoutes);
  app.use('/api/casino', casinoRoutes);
  app.use('/api/money', moneyRoutes);
  app.use('/api/job', jobRoutes);
  app.use('/api/dev', devRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/stocks', stockRoutes);
}

module.exports = { mountRoutes };
