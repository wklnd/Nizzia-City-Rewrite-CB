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

module.exports = { attachAuth };
