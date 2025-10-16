// db.js
const mysql = require('mysql2');
require('dotenv').config();

// ✅ ใช้ createPool แทน createConnection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chaploy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ ทดสอบเชื่อมต่อครั้งเดียวตอนเริ่มเซิร์ฟเวอร์
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ MySQL pool connected successfully!');
    connection.release(); // ปล่อย connection คืน pool
  }
});

// ✅ ส่งออก pool แทน connection
module.exports = pool;
