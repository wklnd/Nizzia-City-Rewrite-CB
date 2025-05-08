// filepath: /Users/oscar/Nizzia-City-Rewrite/backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const crimeRoutes = require('./routes/crimeRoutes');
const gymRoutes = require('./routes/gymRoutes');
const scheduleRegenEnergy = require('./cronjobs/regenEnergy');

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

// Start scheduled cron jobs
scheduleRegenEnergy();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});