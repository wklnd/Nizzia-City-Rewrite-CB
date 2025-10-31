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
const scheduleStockTicker = require('./cronjobs/stockTicker');
const scheduleRegenCooldowns = require('./cronjobs/regenCooldowns');
const scheduleNpcActions = require('./cronjobs/npcActions');
const schedulePlayerSnapshots = require('./cronjobs/playerSnapshot');
const scheduleBankApr = require('./cronjobs/bankApr');
const scheduleDailyReset = require('./cronjobs/dailyReset');

// ------------------------------------------------------
// Safe chalk import (works for both CommonJS and ESM)
// ------------------------------------------------------
let chalk = null;
try {
  const mod = require('chalk');
  chalk = mod && mod.default ? mod.default : mod;
} catch (_) {
  // fallback: no-color shim
  const id = (x) => x;
  chalk = { green: id, yellow: id, red: id, blue: id, gray: id, bold: { red: id } };
}

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  // Vue dev server
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(requestLogger());

// Routes
mountRoutes(app);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// Start cron jobs
if (process.env.DISABLE_CRON !== 'true') {
  scheduleRegenEnergy();
  scheduleRegenNerve();
  scheduleJob();
  scheduleRegenHappiness();
  scheduleStockTicker();
  scheduleBankApr();
  scheduleNpcActions();
  schedulePlayerSnapshots();
  scheduleRegenCooldowns();
  scheduleDailyReset();
}

// Start server
const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, () => {
  console.log(chalk.blue('Server started at ' + new Date().toISOString()));
  console.log(chalk.green(`Server is running on port ${PORT}`));
});
