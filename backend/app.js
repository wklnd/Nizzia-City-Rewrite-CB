// filepath: /Users/oscar/Nizzia-City-Rewrite/backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const crimeRoutes = require('./routes/crimeRoutes');
const casinoRoutes = require('./routes/casinoRoutes');
const gymRoutes = require('./routes/gymRoutes');
const moneyRoutes = require('./routes/moneyRoutes');
const jobRoutes = require('./routes/jobRoutes');
const scheduleRegenEnergy = require('./cronjobs/regenEnergy');
const scheduleRegenNerve = require('./cronjobs/regenNerve');
const scheduleJob = require('./cronjobs/jobCron');

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
//app.use('/api/crime', crimeRoutes);
app.use('/api/gym', gymRoutes);

app.use('/api/casino', casinoRoutes);

app.use('/api/money', moneyRoutes);

app.use('/api/job', jobRoutes);


// Start scheduled cron jobs
scheduleRegenEnergy();
scheduleRegenNerve();
scheduleJob();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});