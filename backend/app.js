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

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// CORS configuration: allow both localhost and 127.0.0.1 (useful across OSes)
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests or same-origin (no Origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // If you later use cookies, also set credentials: true and ensure explicit origins (no *)
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Ensure preflight requests receive the proper CORS headers (Express 5: use '/*')
app.options(/.*/, cors(corsOptions));
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
  scheduleStockTicker();
  scheduleBankApr();
  scheduleNpcActions();
  schedulePlayerSnapshots();
  scheduleRegenCooldowns();
}

// Start server (use 5050 by default to avoid macOS AirPlay conflict on 5000)
const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});