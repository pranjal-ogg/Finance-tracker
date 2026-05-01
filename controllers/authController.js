const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const emailService = require('../utils/emailService');
const { createDefaultCategories } = require('../utils/categoryDefaults');

exports.register = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Check for duplicate email
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const newUserResult = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, preferred_currency, created_at',
      [name, email, passwordHash]
    );

    const user = newUserResult.rows[0];

    // Create default categories for the new user
    await createDefaultCategories(user.id);

    // Send Welcome Email asynchronously
    emailService.sendEmail(
      user.id,
      email,
      'Welcome to Personal Finance Tracker!',
      `<p>Hi ${name}, welcome aboard! We are excited to help you manage your finances.</p>`
    ).catch(err => console.error('Welcome email failed:', err));

    // Return JWT
    const payload = {
      user: { id: user.id }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.login = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Verify user exists
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return JWT
    const payload = {
      user: { id: user.id }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        
        // Remove password_hash from the response object
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getMe = async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, name, email, google_id, preferred_currency, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userResult.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateProfile = async (req, res) => {
  const { name, preferred_currency } = req.body;

  try {
    const updateResult = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           preferred_currency = COALESCE($2, preferred_currency), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, name, email, preferred_currency, updated_at`,
      [name, preferred_currency, req.user.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
