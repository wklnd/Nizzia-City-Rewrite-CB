// Centralized error handling middleware
// Express 5 will forward async errors here automatically
// Keep responses simple and consistent without changing existing API shapes much
// If a handler already sent a response, Express will ignore this

function errorHandler(err, req, res, next) {
  // Default status
  const status = err.status || err.statusCode || 500;

  // Basic payload to avoid leaking internals in production
  const payload = {
    error: err.message || 'Internal Server Error'
  };

  // Optional diagnostics in development
  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  // Ensure we don't send headers twice
  if (res.headersSent) return next(err);
  res.status(status).json(payload);
}

module.exports = errorHandler;
