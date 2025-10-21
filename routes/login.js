const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// ✅ ฟังก์ชันบันทึก log login
async function logUserLogin(db, account_id, username, role) {
  try {
    await db.promise().query(
      `INSERT INTO loglogin (account_id, username, role, login_time)
       VALUES (?, ?, ?, NOW())`,
      [account_id, username, role]
    );
    console.log(`🪵 Login logged for ${username} (${role})`);
  } catch (err) {
    console.error('❌ Error logging login:', err);
  }
}

// ✅ แสดงหน้า Login
router.get('/', (req, res) => {
  let message = null;
  let messageType = null;
  let error = null;

  if (req.query.success === '1') {
    message = 'Welcome back to Chaploy!';
    messageType = 'success';
  } else if (req.query.success === 'admin') {
    message = 'Welcome back, Admin!';
    messageType = 'success';
  }

  res.render('login', { 
    error,
    message,
    messageType
  });
});

// ✅ ตรวจสอบการ Login
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  // 🔹 ค้นใน accounts ก่อน
  const sqlUser = `
    SELECT a.*, c.firstname, c.lastname, c.email 
    FROM accounts a 
    JOIN customers c ON a.customer_id = c.id
    WHERE (a.username = ? OR c.email = ?)
  `;

  try {
    const [results] = await db.promise().query(sqlUser, [username, username]);

    if (results.length > 0) {
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.render('login', { 
          error: '✖ Invalid username or password.', 
          message: null, 
          messageType: null 
        });
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

      // ✅ บันทึกลง loglogin
      await logUserLogin(db, user.id, user.username, user.role);

      return res.render('login', { 
        error: null, 
        message: 'Welcome back to Chaploy!', 
        messageType: 'success' 
      });
    }

    // 🔹 ถ้าไม่เจอใน accounts → ค้นใน staff
    const sqlStaff = `
      SELECT * FROM staff WHERE username = ? OR email = ?
    `;

    const [staffResults] = await db.promise().query(sqlStaff, [username, username]);

    if (staffResults.length === 0) {
      return res.render('login', { 
        error: '✖ Invalid username or password.', 
        message: null, 
        messageType: null 
      });
    }

    const staff = staffResults[0];
    const match =
      staff.password === password ||
      (await bcrypt.compare(password, staff.password));

    if (!match) {
      return res.render('login', { 
        error: '✖ Invalid username or password.', 
        message: null, 
        messageType: null 
      });
    }

    req.session.user = {
      stfID: staff.stfID,
      username: staff.username,
      email: staff.email,
      role: staff.role,
    };

    console.log(`🟣 ADMIN LOGIN: ${staff.username} (${staff.role})`);
    console.log('🧩 Staff object:', staff); // ✅ ตรวจสอบค่าใน console

    // ✅ เพิ่ม try/catch log ลงฐานข้อมูล
    try {
      await db.promise().query(
        `INSERT INTO loglogin (account_id, username, role, login_time)
         VALUES (?, ?, ?, NOW())`,
        [staff.stfID, staff.username, staff.role]
      );
      console.log(`🪵 Login logged for ${staff.username} (${staff.role})`);
    } catch (logErr) {
      console.error('❌ Error logging staff login:', logErr);
    }

    // ✅ แสดงข้อความสำเร็จ
    return res.render('login', { 
      error: null, 
      message: 'Welcome back, Admin!', 
      messageType: 'success' 
    });

  } catch (err2) {
    console.error('❌ Staff login error:', err2);
    return res.render('login', { 
      error: '⚠ Database error.', 
      message: null, 
      messageType: null 
    });
  }
});

module.exports = router;
