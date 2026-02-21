const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Attach req.authUserId if Authorization: Bearer <token> is present and valid.
function attachAuth(req, _res, next) {
  try {
    const auth = req.headers && req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload && payload.sub) {
        req.authUserId = String(payload.sub);
      }
    }
  } catch (_) {
    // ignore invalid token here; controllers can enforce
  }
  next();
}

// Reject with 401 when no valid token was provided.
function requireAuth(req, res, next) {
  if (!req.authUserId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

module.exports = { attachAuth, requireAuth };
