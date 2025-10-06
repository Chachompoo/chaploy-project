// routes/register.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.render('register'); // แสดงหน้า register.ejs
});

router.post('/', (req, res) => {
  const { firstName, lastName, email, phone, password, username } = req.body;

  // ตรวจซ้ำ email
  db.query('SELECT * FROM customers WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('Database error');

    if (results.length > 0) {
      return res.render('register', { error: 'Email already exists!' });
    }

    // 1. Insert into customers
    const insertCustomerSql = 'INSERT INTO customers (firstname, lastname, email, phone) VALUES (?, ?, ?, ?)';
    db.query(insertCustomerSql, [firstName, lastName, email, phone], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database insert error (customers)');
      }

      const customerId = result.insertId;  // ✅ ต้องประกาศในนี้

      console.log("👉 New customerId:", customerId);
      

      // 2. Insert into accounts
      const insertAccountSql = 'INSERT INTO accounts (customer_id, username, password, role) VALUES (?, ?, ?, ?)';
      db.query(insertAccountSql, [customerId, username, password, 'user'], (err, result) => {
        if (err) {
          console.error("❌ Insert account error:", err);
          return res.status(500).send('Database insert error (account): ' + err.message);
        }

        console.log("✅ Insert account success, accountId:", result.insertId);
        res.redirect('/login');
      });
    });
  });
});

module.exports = router;
