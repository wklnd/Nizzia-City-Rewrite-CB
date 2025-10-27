// filepath: /Users/oscar/Nizzia-City-Rewrite/backend/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { mountRoutes } = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const scheduleRegenEnergy = require('./cronjobs/regenEnergy');
const scheduleRegenNerve = require('./cronjobs/regenNerve');
const scheduleJob = require('./cronjobs/jobCron');
const scheduleRegenHappiness = require('./cronjobs/regenHappiness');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger());

// Routes
mountRoutes(app);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// Start scheduled cron jobs (can disable with DISABLE_CRON=true)
if (process.env.DISABLE_CRON !== 'true') {
  scheduleRegenEnergy();
  scheduleRegenNerve();
  scheduleJob();
  scheduleRegenHappiness();
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});