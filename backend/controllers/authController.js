const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// POST /api/auth/register
// Body: { name, email, password }
// Returns: { message, user: { _id, name, email } }
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ name, email: email.toLowerCase(), password: hash });
    await user.save();

    return res.status(201).json({
      message: 'User created',
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register' });
  }
}

// POST /api/auth/login
// Body: { email, password }
// Returns: { token, user: { _id, name, email } }
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

module.exports = { register, login };
