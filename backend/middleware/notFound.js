// Not found middleware to handle unknown routes
function notFound(req, res, next) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = notFound;
