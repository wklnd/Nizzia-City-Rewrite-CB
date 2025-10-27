// HTTP request logger; uses morgan if available, otherwise no-op
let morgan;
try {
  morgan = require('morgan');
} catch (e) {
  morgan = null;
}

function requestLogger() {
  if (!morgan) {
    // Graceful fallback: do nothing if morgan isn't installed yet
    return (req, res, next) => next();
  }
  const format = process.env.NODE_ENV === 'development' ? 'dev' : 'tiny';
  return morgan(format);
}

module.exports = requestLogger;
