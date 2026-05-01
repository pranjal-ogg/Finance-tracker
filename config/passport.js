const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
const emailService = require('../utils/emailService');
const { createDefaultCategories } = require('../utils/categoryDefaults');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        const googleId = profile.id;
        const name = profile.displayName;

        // 1. Check if user already exists by google_id
        let userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
        
        if (userResult.rows.length > 0) {
          return done(null, userResult.rows[0]);
        }

        // 2. Check if user exists by email
        if (email) {
          userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
          
          if (userResult.rows.length > 0) {
            // Link google_id to existing user
            const updatedUserResult = await db.query(
              'UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *',
              [googleId, email]
            );
            return done(null, updatedUserResult.rows[0]);
          }
        }

        // 3. Create new user
        // Generate a placeholder email if missing from the Google profile
        const finalEmail = email || `${googleId}@google.placeholder.com`;
        
        const newUserResult = await db.query(
          'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *',
          [name, finalEmail, googleId]
        );
        
        const user = newUserResult.rows[0];
        
        // Create default categories for the new Google user
        await createDefaultCategories(user.id);
        
        // Send Welcome Email asynchronously
        emailService.sendEmail(
          user.id,
          finalEmail,
          'Welcome to Personal Finance Tracker!',
          `<p>Hi ${name}, welcome aboard! We are excited to help you manage your finances.</p>`
        ).catch(err => console.error('Welcome email failed:', err));
        
        return done(null, user);
      } catch (err) {
        console.error(err);
        return done(err, null);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, userResult.rows[0]);
  } catch (err) {
    done(err, null);
  }
});
