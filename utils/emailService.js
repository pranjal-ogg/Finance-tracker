const nodemailer = require('nodemailer');
const db = require('../config/db');

// Setup Sendgrid SMTP Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey', // This is exactly 'apikey' for sendgrid
    pass: process.env.SENDGRID_API_KEY
  }
});

/**
 * Sends an email using Nodemailer and logs it into the notifications table
 * @param {Number} userId - Required: ID of the user to link the notification
 * @param {String} to - The recipient's email address
 * @param {String} subject - The subject of the email
 * @param {String} htmlContent - The HTML body content of the email
 * @returns {Boolean} - Returns true if successful
 */
exports.sendEmail = async (userId, to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: 'noreply@financetracker.com', // Change this if sending domain must be verified
      to,
      subject,
      html: htmlContent
    };

    // Dispatch the email
    await transporter.sendMail(mailOptions);

    // On success, store the notification in the database
    if (userId) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [userId, subject] // Using the subject line as the notification message summary
      );
    }

    console.log(`Email successfully sent to ${to} | Subject: ${subject}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return false;
  }
};
