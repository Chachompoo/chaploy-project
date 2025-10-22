const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// ✅ Show register page
router.get('/', (req, res) => {
  res.render('register', { error: null, success: null });
});

// ✅ Handle register form
router.post('/', (req, res) => {
  const { firstName, lastName, email, phone, username, password } = req.body;

  // 🔒 ตรวจสอบความแข็งแรงของรหัสผ่าน
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!strongPassword.test(password)) {
    return res.render('register', {
      error:
        '⚠ Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      success: null
    });
  }

  // 🔹 Check if email already exists
  const checkEmailSql = 'SELECT * FROM customers WHERE email = ?';
  db.query(checkEmailSql, [email], async (err, results) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.render('register', { error: '⚠ Database error, please try again.', success: null });
    }

    if (results.length > 0) {
      return res.render('register', { error: '⚠ This email is already registered.', success: null });
    }

    try {
      // 🔹 Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 🔹 Insert into customers
      const insertCustomerSql = `
        INSERT INTO customers (firstname, lastname, phone, email)
        VALUES (?, ?, ?, ?)
      `;
      db.query(insertCustomerSql, [firstName, lastName, phone, email], (err, customerResult) => {
        if (err) {
          console.error('❌ Error inserting customer:', err);
          return res.render('register', { error: '⚠ Failed to save customer data.', success: null });
        }

        const customerId = customerResult.insertId;

        // 🔹 Insert into accounts
        const insertAccountSql = `
          INSERT INTO accounts (username, password, customer_id, role)
          VALUES (?, ?, ?, 'user')
        `;
        db.query(insertAccountSql, [username, hashedPassword, customerId], (err2) => {
          if (err2) {
            console.error('❌ Error inserting account:', err2);
            return res.render('register', { error: '⚠ Failed to create account.', success: null });
          }

          console.log('✅ Registration successful!');
          res.render('register', {
            success: '✔ Your account has been successfully created! Redirecting to login...',
            error: null
          });
        });
      });
    } catch (err) {
      console.error('🔥 bcrypt error:', err);
      res.render('register', { error: '⚠ Something went wrong.', success: null });
    }
  });
});

module.exports = router;
