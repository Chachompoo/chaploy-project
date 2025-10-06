const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// ✅ Password Reset Request Page
router.get('/', (req, res) => {
  res.render('reset', { message: null, error: null });
});

// ✅ Handle Reset Form Submission
router.post('/', (req, res) => {
  const { username } = req.body;

  // Detect email or username
  const isEmail = username.includes('@');
  const query = isEmail 
    ? 'SELECT email FROM customers WHERE email = ?' 
    : 'SELECT email FROM customers c JOIN accounts a ON a.customer_id = c.id WHERE a.username = ?';

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.render('reset', { error: '⚠︎ System error. Please try again later.', message: null });
    }

    if (results.length === 0) {
      return res.render('reset', { error: '✖︎ No user found with that email or username.', message: null });
    }

    const email = results[0].email;
    const token = crypto.randomBytes(20).toString('hex');
    const resetLink = `http://localhost:5000/reset/${token}`;

    // ✅ Save token to DB
    db.query('UPDATE accounts a JOIN customers c ON a.customer_id = c.id SET a.reset_token = ? WHERE c.email = ?', [token, email], (err2) => {
      if (err2) {
        console.error(err2);
        return res.render('reset', { error: '⚠︎ Unable to update reset token.', message: null });
      }

      // ✅ Send email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'chaploy.house@gmail.com', // your email
          pass: 'rqfm hzup fivx ypbv' // Gmail App Password
        }
      });

      const mailOptions = {
  from: '"Chaploy Support" <chaploy.house@gmail.com>',
  to: email,
  subject: 'Reset Your Password | Chaploy',
  html: `
  <div style="font-family: 'Segoe UI', sans-serif; background-color: #f9f6f3; padding: 40px 0;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #d6c6b9, #b59f8c); padding: 20px 0 15px 0; text-align: center;">
  <img src="https://raw.githubusercontent.com/Chachompoo/chaploy-project/main/public/images/Chaploy-remove.png" 
       alt="Chaploy Logo" 
       style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 5px;">
  <h1 style="color: #fff; font-weight: 600; letter-spacing: 1px; margin: 3px 0 0;">Chaploy</h1>
  <p style="color: #fff; opacity: 0.9; font-size: 14px; margin: 3px 0 0;">Your Tea & Serenity Space</p>
</div>

      <!-- Content -->
      <div style="padding: 35px 40px; color: #333;">
        <h2 style="font-weight: 600; color: #5a4b3c;">Reset Your Password</h2>
        <p style="font-size: 16px; line-height: 1.7; color: #555;">
          Hello,
          <br><br>
          We received a request to reset your Chaploy account password.
          Click the button below to set a new password:
        </p>

        <!-- Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetLink}" 
            style="background: #b59f8c; color: #fff; text-decoration: none; padding: 14px 28px; 
                   border-radius: 30px; font-weight: 600; letter-spacing: 0.5px;
                   box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: 0.3s;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 14px; color: #777; line-height: 1.6;">
          This link will expire in <b>15 minutes</b> for your security.
          <br><br>
          If you didn’t request this, please ignore this email — your password will remain unchanged.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 13px; color: #aaa; text-align: center;">
          © 2025 Chaploy. All rights reserved.
          <br>
          Crafted with ☕ and calm moments.
        </p>
      </div>
    </div>
  </div>
  `
};

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          return res.render('reset', { error: '⚠︎ Failed to send reset email. Please try again later.', message: null });
        }

        console.log('Email sent: ' + info.response);
        res.render('reset', { message: `✔︎ A reset link has been sent to ${email}. Please check your inbox.`, error: null });
      });
    });
  });
});

// ✅ Page for setting new password
router.get('/:token', (req, res) => {
  const token = req.params.token;

  db.query('SELECT * FROM accounts WHERE reset_token = ?', [token], (err, results) => {
    if (err) {
      console.error(err);
      return res.render('reset_password', { error: '⚠︎ Database error.', message: null, token: null });
    }

    if (results.length === 0) {
      return res.render('reset_password', { error: '✖︎ Invalid or expired link.', message: null, token: null });
    }

    res.render('reset_password', { token, message: null, error: null });
  });
});

// ✅ Update password
router.post('/:token', async (req, res) => {
  const token = req.params.token;
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    'UPDATE accounts SET password = ?, reset_token = NULL WHERE reset_token = ?',
    [hashedPassword, token],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.render('reset_password', { error: '⚠︎ Database error.', message: null, token });
      }

      if (result.affectedRows === 0) {
        return res.render('reset_password', { error: '✖︎ Invalid or expired link.', message: null, token });
      }

      res.render('reset_password', { message: '✔︎ Your password has been successfully updated!', error: null, token: null });
    }
  );
});

module.exports = router;
