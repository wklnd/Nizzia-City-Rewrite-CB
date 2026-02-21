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
const bankRoutes = require('./bankRoutes');
const hofRoutes = require('./hofRoutes');
const adminRoutes = require('./adminRoutes');
const realEstateRoutes = require('./realEstateRoutes');
const petRoutes = require('./petRoutes');
const marketRoutes = require('./marketRoutes');
const vaultRoutes = require('./vaultRoutes');
const growRoutes = require('./growRoutes');
const businessRoutes = require('./businessRoutes');
const cartelRoutes = require('./cartelRoutes');
const educationRoutes = require('./educationRoutes');

function mountRoutes(app) {
  app.use('/api/items', itemRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/player', playerRoutes);
  // Crime routes
  app.use('/api/crime', crimeRoutes);
  app.use('/api/gym', gymRoutes);
  app.use('/api/casino', casinoRoutes);
  app.use('/api/money', moneyRoutes);
  app.use('/api/job', jobRoutes);
  app.use('/api/dev', devRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/stocks', stockRoutes);
  app.use('/api/bank', bankRoutes);
  app.use('/api/hof', hofRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/realestate', realEstateRoutes);
  app.use('/api/pets', petRoutes);
  app.use('/api/market', marketRoutes);
  app.use('/api/vault', vaultRoutes);
  app.use('/api/grow', growRoutes);
  app.use('/api/business', businessRoutes);
  app.use('/api/cartel', cartelRoutes);
  app.use('/api/education', educationRoutes);
}

module.exports = { mountRoutes };
