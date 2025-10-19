const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// ✅ Middleware: Check Login
function checkLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

/* ================================
   👤 PROFILE PAGE
================================ */
router.get('/profile', checkLogin, async (req, res) => {
  try {
    const [[acc]] = await db.promise().query(
      `SELECT a.customer_id, c.firstname, c.lastname, c.phone, c.email
       FROM accounts a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [req.session.user.id]
    );

    if (!acc) return res.status(404).send('Account not found');

    res.render('profile', { user: acc });
  } catch (err) {
    console.error('❌ Error loading profile:', err);
    res.status(500).send('Internal Server Error');
  }
});

/* ================================
   ✏️ UPDATE PERSONAL INFO
================================ */
router.post('/profile/update', checkLogin, async (req, res) => {
  try {
    const { firstname, lastname, phone } = req.body;

    // ✅ Validate phone number (10 digits)
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Invalid Phone Number</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        </head>
        <body>
          <script>
            Swal.fire({
              icon: 'error',
              title: 'Invalid Phone Number',
              text: 'Please enter a valid 10-digit phone number.',
              confirmButtonColor: '#43593E',
              showClass: { popup: 'animate__animated animate__fadeInDown' },
              hideClass: { popup: 'animate__animated animate__fadeOutUp' },
              backdrop: 'rgba(0,0,0,0.4)'
            }).then(() => window.location='/profile');
          </script>
        </body>
        </html>
      `);
    }

    // ✅ Get customer_id
    const [[acc]] = await db.promise().query(
      `SELECT customer_id FROM accounts WHERE id = ?`,
      [req.session.user.id]
    );

    if (!acc) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Account Not Found</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        </head>
        <body>
          <script>
            Swal.fire({
              icon: 'error',
              title: 'Account Not Found',
              text: 'Please log in again.',
              confirmButtonColor: '#43593E',
              showClass: { popup: 'animate__animated animate__fadeInDown' },
              hideClass: { popup: 'animate__animated animate__fadeOutUp' }
            }).then(() => window.location='/login');
          </script>
        </body>
        </html>
      `);
    }

    const customerId = acc.customer_id;

    // ✅ Update customer info
    await db.promise().query(
      `UPDATE customers SET firstname=?, lastname=?, phone=? WHERE id=?`,
      [firstname, lastname, phone, customerId]
    );

    // ✅ Success popup
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Profile Updated</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'success',
            title: 'Profile Updated',
            text: 'Your personal information has been successfully updated.',
            confirmButtonColor: '#43593E',
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            backdrop: 'rgba(0,0,0,0.4)'
          }).then(() => window.location='/profile');
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('❌ Error updating profile:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Server Error</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'Something went wrong. Please try again later.',
            confirmButtonColor: '#43593E',
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            backdrop: 'rgba(0,0,0,0.4)'
          }).then(() => window.location='/profile');
        </script>
      </body>
      </html>
    `);
  }
});

/* ================================
   🔐 CHANGE PASSWORD
================================ */
router.post('/profile/password', checkLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const accountId = req.session.user.id;

    if (newPassword !== confirmPassword) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Password Mismatch</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        </head>
        <body>
          <script>
            Swal.fire({
              icon: 'error',
              title: 'Password Mismatch',
              text: 'The new passwords do not match. Please try again.',
              confirmButtonColor: '#43593E',
              showClass: { popup: 'animate__animated animate__fadeInDown' },
              hideClass: { popup: 'animate__animated animate__fadeOutUp' },
              backdrop: 'rgba(0,0,0,0.4)'
            }).then(() => window.location='/profile');
          </script>
        </body>
        </html>
      `);
    }

    const [[account]] = await db.promise().query(
      `SELECT * FROM accounts WHERE id = ?`,
      [accountId]
    );

    if (!account) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Account Not Found</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        </head>
        <body>
          <script>
            Swal.fire({
              icon: 'error',
              title: 'Account Not Found',
              text: 'Please log in again.',
              confirmButtonColor: '#43593E'
            }).then(() => window.location='/login');
          </script>
        </body>
        </html>
      `);
    }

    const match = await bcrypt.compare(currentPassword, account.password);
    if (!match) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Incorrect Password</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        </head>
        <body>
          <script>
            Swal.fire({
              icon: 'error',
              title: 'Incorrect Password',
              text: 'The current password you entered is incorrect.',
              confirmButtonColor: '#43593E'
            }).then(() => window.location='/profile');
          </script>
        </body>
        </html>
      `);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.promise().query(`UPDATE accounts SET password = ? WHERE id = ?`, [hashed, accountId]);

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Password Changed</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'success',
            title: 'Password Changed',
            text: 'Your password has been successfully updated.',
            confirmButtonColor: '#43593E',
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            backdrop: 'rgba(0,0,0,0.4)'
          }).then(() => window.location='/profile');
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('❌ Error changing password:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Server Error</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'Something went wrong while changing your password.',
            confirmButtonColor: '#43593E',
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            backdrop: 'rgba(0,0,0,0.4)'
          }).then(() => window.location='/profile');
        </script>
      </body>
      </html>
    `);
  }
});

/* ================================
   🛍️ หน้า Purchases
================================ */
router.get('/purchases', checkLogin, async (req, res) => {
  try {
    // ✅ ตรวจ session
    if (!req.session.user) {
      console.warn('⚠️ No user session found!');
      return res.redirect('/login');
    }

    console.log('✅ Session user:', req.session.user);

    const [[acc]] = await db.promise().query(
      `SELECT customer_id FROM accounts WHERE id = ?`,
      [req.session.user.id]
    );

    if (!acc) {
      console.warn('⚠️ Account not found for user ID:', req.session.user.id);
      return res.redirect('/login');
    }

    const customerId = acc.customer_id;

    const [orders] = await db.promise().query(`
      SELECT 
        o.id AS order_id,
        DATE_FORMAT(o.order_date, '%d/%m/%Y %H:%i') AS order_date,
        o.total,
        o.payment_status,
        o.order_status,
        p.slip_image
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.customer_id = ?
      ORDER BY o.order_date DESC
    `, [customerId]);

    console.log('✅ Orders found:', orders.length);

    const formattedOrders = orders.map(o => ({
      ...o,
      total: parseFloat(o.total) || 0
    }));

    res.render('purchases', { orders: formattedOrders });
  } catch (err) {
    console.error('❌ Error loading purchases:', err);
    res.status(500).send('Internal Server Error');
  }
});

/* ================================
   🧾 API: Get order items (for popup)
================================ */
router.get('/purchases/items/:orderId', checkLogin, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // หา customer_id ของ user
    const [[acc]] = await db.promise().query(
      `SELECT customer_id FROM accounts WHERE id = ?`,
      [req.session.user.id]
    );
    if (!acc) return res.json({ success: false, message: 'Account not found' });

    // ยืนยันว่าออเดอร์นี้เป็นของลูกค้าคนนี้
    const [[order]] = await db.promise().query(
      `SELECT id FROM orders WHERE id = ? AND customer_id = ?`,
      [orderId, acc.customer_id]
    );
    if (!order) return res.json({ success: false, message: 'Order not found' });

    // ✅ ดึงสินค้า: ใช้ price_each (หน่วย) + quantity
    const [items] = await db.promise().query(`
      SELECT 
        p.name,
        p.image,
        oi.quantity,
        oi.price_each AS unit_price,
        oi.subtotal
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    if (!items.length) {
      return res.json({ success: false, message: 'No items found' });
    }

    // normalize ตัวเลขกันพลาด
    const normalized = items.map(i => ({
      ...i,
      unit_price: parseFloat(i.unit_price ?? 0),
      quantity: parseInt(i.quantity ?? 0, 10),
      subtotal: parseFloat(i.subtotal ?? ( (i.unit_price ?? 0) * (i.quantity ?? 0) ))
    }));

    res.json({ success: true, items: normalized });
  } catch (err) {
    console.error('❌ Error fetching order items:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


/* ================================
   ❌ ยกเลิกออเดอร์ (ฝั่งลูกค้า)
================================ */
router.post('/purchases/cancel/:id', checkLogin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user?.id;

    console.log('🟢 Cancel request by user ID:', userId);

    // ✅ ตรวจสอบบัญชีและ customer_id
    const [[acc]] = await db.promise().query(
      `SELECT customer_id FROM accounts WHERE id = ?`,
      [userId]
    );

    console.log('🟢 Found account:', acc);

    if (!acc || !acc.customer_id) {
      return res.send(`
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script>
          Swal.fire({
            icon: 'error',
            title: 'Session Error',
            text: 'Your account session expired. Please log in again.',
            confirmButtonColor: '#43593E'
          }).then(() => window.location='/login');
        </script>
      `);
    }

    const customerId = acc.customer_id;

    // ✅ ตรวจสอบว่า order เป็นของลูกค้าคนนี้จริง ๆ
    const [[order]] = await db.promise().query(
      `SELECT id, order_status FROM orders WHERE id = ? AND customer_id = ?`,
      [orderId, customerId]
    );

    console.log('🟢 Found order:', order);

    if (!order || (order.order_status || '').toLowerCase() !== 'pending') {
      return res.send(`
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script>
          Swal.fire({
            icon: 'error',
            title: 'Unable to Cancel',
            text: 'This order cannot be cancelled.',
            confirmButtonColor: '#43593E'
          }).then(() => window.location='/purchases');
        </script>
      `);
    }

    // ✅ อัปเดตสถานะ
    await db.promise().query(
      `UPDATE orders SET order_status = 'cancelled' WHERE id = ?`,
      [orderId]
    );

    console.log('✅ Order cancelled successfully!');

    res.send(`
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css"/>
      <script>
        Swal.fire({
          icon: 'success',
          title: 'Order Cancelled',
          text: 'Please contact our support team for a refund within 3–5 business days.',
          confirmButtonColor: '#43593E',
          showClass: { popup: 'animate__animated animate__fadeInDown' },
          hideClass: { popup: 'animate__animated animate__fadeOutUp' }
        }).then(() => window.location='/purchases');
      </script>
    `);

  } catch (err) {
    console.error('❌ Error cancelling order:', err);
    res.status(500).send(`
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      <script>
        Swal.fire({
          icon: 'error',
          title: 'Server Error',
          text: 'Something went wrong while cancelling the order.',
          confirmButtonColor: '#43593E'
        }).then(() => window.location='/purchases');
      </script>
    `);
  }
});




module.exports = router;
