const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// ✅ แสดงหน้า Login
router.get('/', (req, res) => {
  res.render('login', { error: null, success: req.query.success });
});

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  // 🔹 ค้นใน accounts ก่อน
  const sqlUser = `
    SELECT a.*, c.firstname, c.lastname, c.email 
    FROM accounts a 
    JOIN customers c ON a.customer_id = c.id
    WHERE (a.username = ? OR c.email = ?)
  `;

  db.query(sqlUser, [username, username], async (err, results) => {
    if (err) {
      console.error(err);
      return res.render('login', { error: '⚠ Database error.', success: null });
    }

    if (results.length > 0) {
      // 🔹 เจอใน accounts (user)
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.render('login', { error: '✖ Invalid username or password.', success: null });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role
      };

      console.log(`🟢 USER LOGIN: ${user.username} (${user.role})`);
      return res.redirect('/');
    }

    // 🔹 ถ้าไม่เจอใน accounts → ค้นใน staff
    const sqlStaff = `
      SELECT * FROM staff WHERE username = ? OR email = ?
    `;

    db.query(sqlStaff, [username, username], async (err2, staffResults) => {
      if (err2) {
        console.error(err2);
        return res.render('login', { error: '⚠ Database error.', success: null });
      }

      if (staffResults.length === 0) {
        return res.render('login', { error: '✖ Invalid username or password.', success: null });
      }

      const staff = staffResults[0];

      // ⚠ ถ้ายังไม่ได้ใช้ bcrypt ให้เอา comment ด้านล่างออกภายหลัง
      const match =
        staff.password === password ||
        (await bcrypt.compare(password, staff.password));

      if (!match) {
        return res.render('login', { error: '✖ Invalid username or password.', success: null });
      }

      req.session.user = {
        id: staff.stfID,
        username: staff.username,
        email: staff.email,
        role: staff.role,
      };

      console.log(`🟣 ADMIN LOGIN: ${staff.username} (${staff.role})`);
      return res.redirect('/admin'); // ✅ พาไปหน้า admin
    });
  });
});

module.exports = router;
