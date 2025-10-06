// routes/login.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.render('login', { error: null, success: req.query.success });
});

router.post('/', (req, res) => {
  const { username, password } = req.body;

  // login ผ่าน username หรือ email ก็ได้
  const sql = `
    SELECT a.*, c.firstname, c.lastname, c.email 
    FROM accounts a 
    JOIN customers c ON a.customer_id = c.id
    WHERE (a.username = ? OR c.email = ?) AND a.password = ?
  `;

  db.query(sql, [username, username, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.render('login', { error: 'Database error', success: null });
    }

    if (results.length === 0) {
      return res.render('login', { error: 'Username/Email หรือ Password ไม่ถูกต้อง', success: null });
    }

    req.session.user = results[0]; // เก็บ session
    res.redirect('/');
  });
});

// ✅ route signout แยกออกมา
router.get('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid'); // เคลียร์ cookie
    res.redirect('/login'); // กลับไปหน้า login
  });
});

module.exports = router;
