const express = require('express');
const router = express.Router();
const db = require('../db');
const checkAdmin = require('../middleware/checkAdmin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// ================================
// ✅ หน้าเมนูหลักของแอดมิน
// ================================
router.get('/', checkAdmin, (req, res) => {
  res.render('admin/index', {
    title: 'Admin Panel',
    user: req.session.user
  });
});

// ================================
// ✅ ตั้งค่า multer สำหรับอัปโหลดรูปสินค้า
// ================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/products'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// ================================
// 🛍 [1] แสดงรายการสินค้า
// ================================
router.get('/products', checkAdmin, (req, res) => {
  const search = req.query.q ? `%${req.query.q}%` : '%';
  const sql = `
    SELECT 
      p.*, 
      c.name AS category_name,
      s1.fullname AS created_by_name
    FROM products p
    LEFT JOIN categories c ON p.categories_id = c.id
    LEFT JOIN staff s1 ON p.created_by = s1.stfID
    WHERE p.name LIKE ? OR p.description LIKE ?
    ORDER BY p.id ASC
  `;
  db.query(sql, [search, search], (err, products) => {
    if (err) throw err;
    res.render('admin/products_list', { products, q: req.query.q || '' });
  });
});

// ================================
// ➕ [2] เพิ่มสินค้าใหม่
// ================================
router.get('/products/add', checkAdmin, (req, res) => {
  db.query('SELECT * FROM categories', (err, categories) => {
    if (err) throw err;
    res.render('admin/add_product', { categories });
  });
});

router.post('/products/add', checkAdmin, upload.single('image'), (req, res) => {
  const staffId = req.session.user?.staff_id ?? req.session.user?.id ?? null;
  const { name, description, price, stock, category_id, status } = req.body;
  const image = req.file ? '/uploads/products/' + req.file.filename : null;

  const sql = `
    INSERT INTO products (name, description, price, stock, categories_id, status, image, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  db.query(sql, [name, description, price, stock, category_id, status, image, staffId], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
});

// ================================
// ✏️ [3] แก้ไขสินค้า
// ================================
router.get('/products/edit/:id', checkAdmin, (req, res) => {
  const productId = req.params.id;
  const sql = `
    SELECT 
      p.*, 
      c.name AS category_name,
      s1.fullname AS created_by_name,
      s2.fullname AS updated_by_name
    FROM products p
    LEFT JOIN categories c ON p.categories_id = c.id
    LEFT JOIN staff s1 ON p.created_by = s1.stfID
    LEFT JOIN staff s2 ON p.updated_by = s2.stfID
    WHERE p.id = ?
  `;
  db.query(sql, [productId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.redirect('/admin/products');
    const product = results[0];
    db.query('SELECT * FROM categories', (catErr, categories) => {
      if (catErr) throw catErr;
      res.render('admin/edit_product', { product, categories });
    });
  });
});

router.post('/products/edit/:id', checkAdmin, upload.single('image'), (req, res) => {
  const staffId = req.session.user?.staff_id ?? req.session.user?.id ?? null;
  const { name, description, price, stock, category_id, status, old_image } = req.body;
  const image = req.file ? '/uploads/products/' + req.file.filename : old_image;

  const sql = `
    UPDATE products
    SET name=?, description=?, price=?, stock=?, categories_id=?, status=?, image=?, updated_by=?, updated_at=NOW()
    WHERE id=?
  `;
  db.query(sql, [name, description, price, stock, category_id, status, image, staffId, req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
});

// ================================
// 🗑 [4] ลบสินค้า
// ================================
router.get('/products/delete/:id', checkAdmin, (req, res) => {
  const sql = 'DELETE FROM products WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
});

// ================================
// 👥 [5] จัดการพนักงาน
// ================================
router.get('/employee', checkAdmin, (req, res) => {
  const sql = 'SELECT * FROM staff ORDER BY stfID ASC';
  db.query(sql, (err, employees) => {
    if (err) throw err;
    res.render('admin/employee', { employees });
  });
});

// เพิ่มแอดมินใหม่ (AJAX)
router.post('/employee/add', checkAdmin, async (req, res) => {
  const bcrypt = require('bcrypt');
  const { fullname, email, username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO staff (fullname, email, username, password, role)
      VALUES (?, ?, ?, ?, 'admin')
    `;
    db.query(sql, [fullname, email, username, hashedPassword], (err, result) => {
      if (err) {
        console.error('❌ Insert Error:', err);
        return res.json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, message: 'Admin added successfully' });
    });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  }
});

// ================================
// 📊 [6] Dashboard (Real Data Version)
// ================================
router.get('/dashboard', checkAdmin, async (req, res) => {
  try {
    const summary = {};
    const chartData = {};
    const kpi = {};

    // ----------------------------------------
    // ✅ 1. KPI SUMMARY (ข้อมูลจริง)
    // ----------------------------------------
    const [[totalSales]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS totalSales FROM orders WHERE payment_status = 'paid'
    `);

    const [[totalOrders]] = await db.promise().query(`
      SELECT COUNT(*) AS totalOrders FROM orders
    `);

    const [[totalCustomers]] = await db.promise().query(`
      SELECT COUNT(*) AS totalCustomers FROM customers
    `);

    const [[totalProducts]] = await db.promise().query(`
      SELECT COUNT(*) AS totalProducts FROM products
    `);

    const [[totalStaff]] = await db.promise().query(`
      SELECT COUNT(*) AS totalStaff FROM staff
    `);

    // ✅ Total Profit (จากราคาขาย - ต้นทุน)
    const [[totalProfit]] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(oi.quantity * (p.price - p.cost)), 0) AS totalProfit
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
    `);


    // ✅ Daily Visitors (จาก loglogin)
    const [[dailyVisitors]] = await db.promise().query(`
      SELECT COUNT(*) AS todayVisits 
      FROM loglogin 
      WHERE DATE(login_time) = CURDATE()
    `);

    const [[yesterdayVisitors]] = await db.promise().query(`
      SELECT COUNT(*) AS yesterdayVisits 
      FROM loglogin 
      WHERE DATE(login_time) = CURDATE() - INTERVAL 1 DAY
    `);

    summary.totalSales     = Number(totalSales.totalSales) || 0;
    summary.totalOrders    = totalOrders.totalOrders || 0;
    summary.totalCustomers = totalCustomers.totalCustomers || 0;
    summary.totalProducts  = totalProducts.totalProducts || 0;
    summary.totalStaff     = totalStaff.totalStaff || 0;
    summary.dailyVisitors  = dailyVisitors.todayVisits || 0;
    summary.totalProfit    = totalProfit.totalProfit || 0;


    // ✅ เปอร์เซ็นต์เพิ่มขึ้นของผู้เข้าใช้งานวันนี้ vs เมื่อวาน
    const today = dailyVisitors.todayVisits || 0;
    const yesterday = yesterdayVisitors.yesterdayVisits || 0;
    kpi.visitorGrowth = yesterday > 0 
      ? (((today - yesterday) / yesterday) * 100).toFixed(1) 
      : today > 0 ? 100 : 0;

    // ----------------------------------------
    // ✅ 2. SALES CHART (ยอดขายจริงรายเดือน)
    // ----------------------------------------
    const [salesChart] = await db.promise().query(`
      SELECT 
        MONTH(created_at) AS month, 
        DATE_FORMAT(created_at, '%b') AS label,
        SUM(total) AS total
      FROM orders
      WHERE YEAR(created_at) = YEAR(CURDATE())
      AND payment_status = 'paid'
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthMap = Object.fromEntries(salesChart.map(r => [r.label, Number(r.total || 0)]));

    chartData.salesMonths = months;
    chartData.salesValues = months.map(m => monthMap[m] || 0);

    // ----------------------------------------
// ✅ 3. RECENT ORDERS (ใช้ order_status จริง)
// ----------------------------------------
const [recentOrders] = await db.promise().query(`
  SELECT 
    o.id,
    CONCAT(c.firstname, ' ', c.lastname) AS customer_name,
    DATE_FORMAT(o.created_at, '%d/%m/%Y') AS date,
    o.total,
    o.order_status
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  ORDER BY o.created_at ASC
  LIMIT 5
`);

  // ----------------------------------------
  // ✅ 4. STATUS CHART (วงกลมจาก order_status จริง)
  // ----------------------------------------
    const [statusData] = await db.promise().query(`
    SELECT order_status, COUNT(*) AS count
    FROM orders
    GROUP BY order_status
  `);

  const allStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const statusCounts = Object.fromEntries(statusData.map(s => [s.order_status.toLowerCase(), s.count]));

  chartData.statusLabels = allStatuses.map(s =>
    s.charAt(0).toUpperCase() + s.slice(1)
  );
  chartData.statusValues = allStatuses.map(s => statusCounts[s] || 0);


    // ----------------------------------------
    // ✅ 5. ส่งข้อมูลไป render
    // ----------------------------------------
    res.render('admin/dashboard', { summary, chartData, recentOrders, kpi });

  } catch (err) {
    console.error('❌ Dashboard Error:', err);
      es.status(500).send('Internal Server Error');
  }
});

// ================================
// 📄 [6.1] PDF Monthly Sales Report (English Version)
// ================================
router.get('/reports/sales', checkAdmin, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const fs = require('fs'); // ✅ เพิ่มบรรทัดนี้สำคัญมาก

    const now = new Date();
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const filename = `sales_report_${month}_${year}.pdf`;

    // ✅ ตั้งค่า header ให้ browser ดาวน์โหลด
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // ✅ สร้างเอกสาร PDF
    const doc = new PDFDocument({ margin: 50 });

    // ✅ บอก path ฟอนต์
    const fontPath = path.join(__dirname, '../public/fonts/Sarabun-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    // ✅ ต้อง pipe หลังสร้าง doc เสมอ
    doc.pipe(res);

    // ===== Header =====
    doc
      .fontSize(22)
      .fillColor('#6C63FF')
      .text('Chaploy Monthly Sales Report', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor('black')
      .text(`Report Date: ${now.toLocaleDateString('en-GB')}`, { align: 'center' })
      .moveDown(1.2);

    // ===== Query Orders =====
    const [orders] = await db.promise().query(`
      SELECT 
        o.id,
        CONCAT(c.firstname, ' ', c.lastname) AS customer_name,
        o.total,
        o.order_status,
        DATE_FORMAT(o.created_at, '%d/%m/%Y') AS date
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE MONTH(o.created_at) = MONTH(CURDATE())
        AND YEAR(o.created_at) = YEAR(CURDATE())
      ORDER BY o.created_at ASC
    `);

    if (!orders.length) {
      doc.fontSize(14).fillColor('gray')
        .text('No orders found for this month.', { align: 'center' });
      doc.end();
      return;
    }

    // ===== Table Header =====
const startX = 60;
let y = doc.y + 10;

// 🔹 พื้นหลังหัวตาราง
doc
  .rect(startX - 5, y - 4, 500, 22)
  .fillOpacity(0.05)
  .fill('#6C63FF')
  .fillOpacity(1);

// 🔹 หัวตาราง
doc
  .font(fontPath)
  .fontSize(13)
  .fillColor('#6C63FF')
  .text('ID', startX, y)
  .text('Customer', startX + 60, y)
  .text('Date', startX + 240, y)
  .text('Total (฿)', startX + 340, y, { width: 80, align: 'right' })
  .text('Status', startX + 440, y);
y += 22;

doc
  .moveTo(startX - 5, y)
  .lineTo(550, y)
  .strokeColor('#ddd')
  .stroke();
y += 10;

// ===== Table Rows =====
doc.font(fontPath).fontSize(12).fillColor('black');

orders.forEach((o, index) => {
  if (y > 740) {
    doc.addPage();
    y = 60;
  }

  // จัดข้อมูล
  const totalValue = `฿${Number(o.total || 0).toLocaleString('en-US')}`;
  const status = o.order_status
    ? o.order_status.charAt(0).toUpperCase() + o.order_status.slice(1)
    : '-';

  // สลับสีพื้นหลังแถว
  if (index % 2 === 0) {
    doc.rect(startX - 5, y - 2, 500, 20).fillOpacity(0.04).fill('#EAE6FF').fillOpacity(1);
  }

  // ข้อมูลแถว
  doc
    .fillColor('black')
    .text(`${o.id}`, startX, y)
    .text(o.customer_name, startX + 60, y)
    .text(o.date, startX + 240, y)
    .text(totalValue, startX + 340, y, { width: 80, align: 'right' })
    .text(status, startX + 440, y);

  y += 22;
});

// ===== Summary =====
const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
y += 25;

doc.moveTo(startX - 5, y - 8).lineTo(550, y - 8).strokeColor('#ccc').stroke();

doc
  .font(fontPath)
  .fontSize(13)
  .fillColor('#6C63FF')
  .text(`Total Sales: ฿${totalRevenue.toLocaleString('en-US')}`, 400, y, {
    width: 140,
    align: 'right'
  });

    doc.end();
  } catch (err) {
    console.error('❌ PDF Report Error:', err);
    res.status(500).send('Error generating PDF report.');
  }
});

// ================================
// ✅  Manage Orders (Fixed Version)
// ================================
router.get('/orders', checkAdmin, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';

    const [rows] = await db.promise().query(`
      SELECT 
        o.id AS order_id,
        o.customer_id,
        c.firstname,
        c.lastname,
        c.email,
        IFNULL(o.total, 0) AS total,
        o.payment_status,
        o.order_status,
        o.created_at,
        o.cancelled_by,
        s.fullname AS staff_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN staff s ON o.cancelled_by = s.stfID
      WHERE 
        CONCAT(c.firstname, ' ', c.lastname) LIKE ? OR
        o.id LIKE ? OR
        o.payment_status LIKE ? OR
        o.order_status LIKE ? OR
        s.fullname LIKE ?
      ORDER BY o.created_at ASC
    `, [q, q, q, q, q]);

    // ✅ เพิ่ม logic แปลงสถานะให้สวยงาม
    const formatted = rows.map(o => {
      let displayStatus = o.order_status;

      if (displayStatus && displayStatus.toLowerCase().includes('cancelled')) {
      if (o.cancelled_by && o.staff_name) {
        displayStatus = `Cancelled by ${o.staff_name}`;
      } else if (displayStatus.toLowerCase().includes('customer')) {
        displayStatus = `Cancelled by Customer`;
      } else {
        displayStatus = `Cancelled by Customer`;
      }
    }


      return {
        ...o,
        total: parseFloat(o.total || 0).toFixed(2),
        display_status: displayStatus,
        created_at: o.created_at
          ? new Date(o.created_at).toLocaleString('th-TH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          : '—'
      };
    });

    res.render('admin/admin_orders', { orders: formatted, q: req.query.q || '' });

  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ================================
// 💳 [7] จัดการการชำระเงิน
// ================================
router.get('/payments', checkAdmin, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';

    const [rows] = await db.promise().query(`
  SELECT 
    p.id AS payment_id,
    o.id AS order_id,
    c.id AS customer_id,
    CONCAT(c.firstname, ' ', c.lastname) AS customer_name,
    IFNULL(o.total, 0) AS total,  -- ✅ ใช้ total จากตาราง orders โดยตรง
    p.slip_image AS slip,
    p.status,
    p.verified_at,
    p.payment_date,
    s.fullname AS verified_by_name
  FROM payments p
  JOIN orders o ON p.order_id = o.id
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN staff s ON p.verified_by = s.stfID
  WHERE 
    CONCAT(c.firstname, ' ', c.lastname) LIKE ? OR
    o.id LIKE ? OR
    p.status LIKE ? OR
    s.fullname LIKE ?
  ORDER BY p.payment_date ASC
`, [q, q, q, q]);


    // ✅ Format ให้เหมือนหน้า Orders
  const payments = rows.map((p, i) => {
  const cleanTotal = parseFloat(String(p.total).replace(/[^0-9.-]+/g, "")) || 0;
  return {
    ...p,
    no: i + 1,
    total: Number(p.total || 0),
    payment_date: p.payment_date
      ? new Date(p.payment_date).toLocaleString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      : '—',
    verified_at: p.verified_at
      ? new Date(p.verified_at).toLocaleString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      : '—'
  };
});


    res.render('admin/admin_payments', {
      payments,
      q: req.query.q || ''
    });
  } catch (err) {
    console.error('❌ Error fetching payments:', err);
    res.status(500).send('Internal Server Error');
  }
});


// ================================
// 🧾 [8] แสดงคำสั่งซื้อ (Orders)
// ================================
router.get('/orders', checkAdmin, async (req, res) => {
  try {
    const q = req.query.q || '';
    const searchTerm = `%${q}%`;

    // ✅ ถ้าผู้ใช้พิมพ์เป็นตัวเลขล้วน เช่น 0006 → แปลงเป็น int ก่อน
    const numericId = /^\d+$/.test(q) ? parseInt(q, 10) : null;

    const [orders] = await db.promise().query(`
      SELECT 
        o.id AS order_id,
        c.firstname,
        c.lastname,
        o.email,
        o.phone,
        o.total,
        o.payment_status,
        o.order_status,
        o.created_at,
        s.fullname AS cancelled_by_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN staff s ON o.cancelled_by = s.stfID
      WHERE 
        c.firstname LIKE ? OR
        c.lastname LIKE ? OR
        o.email LIKE ? OR
        o.phone LIKE ? OR
        o.payment_status LIKE ? OR
        o.order_status LIKE ? 
        ${numericId !== null ? 'OR o.id = ?' : ''}
      ORDER BY CAST(o.id AS UNSIGNED) ASC
    `, numericId !== null 
         ? [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, numericId]
         : [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);

    // 🟢 เพิ่ม logic แยก Cancelled by Customer / Admin
    const formatted = orders.map((o, index) => {
  let displayStatus = o.order_status;

  if (o.order_status?.startsWith('Cancelled by')) {
    displayStatus = `Cancelled by ${o.cancelled_by_name || 'Admin'}`;
  }

      return {
        ...o,
        no: index + 1,
        total: parseFloat(o.total || 0),
        display_status: displayStatus,
        created_at: o.created_at
          ? new Date(o.created_at).toLocaleString('th-TH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          : '—'
      };
    });

    // ✅ ส่งค่า display_status ไปแทน order_status
    res.render('admin/admin_orders', { 
      title: 'Manage Orders',
      orders: formatted,
      q
    });

  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ================================
// ✅ [5] ดูรายละเอียดออเดอร์ (แสดงชื่อคนยกเลิก + ปิดแก้ไขถ้ายกเลิกแล้ว)
// ================================
router.get('/orders/:id', checkAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;

    // ✅ ดึงข้อมูล order หลัก พร้อมชื่อ staff ถ้ามี
    const [[order]] = await db.promise().query(`
      SELECT 
        o.*,
        c.firstname,
        c.lastname,
        c.email,
        c.phone,
        s.fullname AS staff_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN staff s ON o.cancelled_by = s.stfID
      WHERE o.id = ?
    `, [orderId]);

    if (!order) return res.status(404).send('Order not found');

    // ✅ ดึงรายการสินค้าในออเดอร์
    const [items] = await db.promise().query(`
      SELECT 
        oi.*, 
        p.name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // ✅ ดึงสลิป (ถ้ามี)
    const [[payment]] = await db.promise().query(`
      SELECT slip_image FROM payments WHERE order_id = ? LIMIT 1
    `, [orderId]);

    order.slip_image = payment ? payment.slip_image : null;

    // ✅ เพิ่มข้อความสถานะที่แสดงผลจริง
    if (order.order_status === 'cancelled') {
      order.display_status = order.staff_name
        ? `Cancelled by ${order.staff_name}`
        : 'Cancelled by Customer';
    } else {
      order.display_status = order.order_status;
    }


    res.render('admin/admin_order_detail', { order, items });

  } catch (err) {
    console.error('❌ Error fetching order details:', err);
    res.status(500).send('Internal Server Error');
  }
});


// ✅ [POST] ยืนยันการชำระเงิน + สร้างใบเสร็จ + ส่งเมล
router.post('/payments/verify/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const staffId = req.session.user?.id || req.session.user?.stfID; // ✅ เก็บรหัส staff

    if (!staffId) {
      return res.status(400).json({ error: 'Missing staff ID in session' });
    }

    await db.promise().query(`
      UPDATE payments
      SET status = 'verified',
          verified_by = ?,
          verified_at = NOW()
      WHERE id = ?
    `, [staffId, paymentId]);

    // 2. ดึงข้อมูลใบเสร็จ
    const [[info]] = await db.promise().query(`
      SELECT 
        p.order_id,
        c.firstname,
        c.lastname,
        c.email,
        o.created_at,
        o.total
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE p.id = ?
    `, [paymentId]);

    if (!info) return res.json({ success: false, message: 'Payment not found' });

    // 3. ดึงรายการสินค้า
    const [items] = await db.promise().query(`
      SELECT p.name, oi.quantity, oi.price_each, oi.subtotal
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [info.order_id]);

    // 4. เตรียม path
    const folderPath = path.join(__dirname, '../public/uploads/receipts');
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    const fileName = `receipt_${String(info.order_id).padStart(4, '0')}.pdf`;
    const filePath = path.join(folderPath, fileName);

// ✅ [CHAPLOY HOUSE COMPANY - Final Layout Adjusted]
const doc = new PDFDocument({ size: 'A4', margin: 50 });
const stream = fs.createWriteStream(filePath);
doc.pipe(stream);

// 🌿 สีหลัก
const mainColor = '#6d3b2c';
const textColor = '#3b2b23';
const bgBox = '#f9f8f3';
const lineColor = '#ddd3c5';

// ✅ พื้นหลัง (ถ้ามี)
const bgPath = path.join(__dirname, '../public/images/bg_receipt.jpg');
if (fs.existsSync(bgPath)) {
  doc.image(bgPath, 0, 0, { width: doc.page.width, height: doc.page.height });
}

// ✅ โลโก้ (ขยับขึ้นให้สูงกว่าเดิม)
const logoPath = path.join(__dirname, '../public/images/Chaploy-remove.png');
if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 50, -10, { width: 140 }); // ⬆ ยกขึ้นจากขอบกระดาษนิด (~10px เหนือเดิม)
}

// ✅ Title
doc.font('Helvetica-Bold').fontSize(22).fillColor(mainColor)
  .text('RECEIPT', 420, 45, { align: 'right' });

// ✅ ข้อมูลบริษัท + Order
doc.moveDown(3);
doc.font('Helvetica-Bold').fontSize(13).fillColor(mainColor)
  .text('Chaploy House Company', 50, 135); // ⬆ ยกขึ้นเล็กน้อย
doc.font('Helvetica').fillColor(textColor)
  .text('Chaploy House')
  .text('062-884-0577')
  .text('123 Anywhere St., Any City, ST 12345');

doc.text(`Order : ${String(info.order_id).padStart(4, '0')}`, 420, 135)
   .text(`${new Date(info.created_at).toLocaleString('th-TH')}`, 420);

// ✅ เส้นคั่นหัว (ขยับ “ลงอีก” เพื่อให้โล่งสบายตา)
doc.moveTo(50, 230).lineTo(550, 230).strokeColor(lineColor).lineWidth(1).stroke();

// ✅ ตารางสินค้า
const tableTop = 245; // ⬇ เริ่มหลังเส้นคั่นเล็กน้อย
doc.roundedRect(50, tableTop, 500, 30 + items.length * 20 + 10, 10)
   .strokeColor(lineColor)
   .lineWidth(0.5)
   .fillOpacity(1)
   .fill(bgBox);

// Header ตาราง
doc.font('Helvetica-Bold').fillColor(mainColor).fontSize(12);
doc.text('ITEM', 70, tableTop + 10);
doc.text('QTY', 300, tableTop + 10, { width: 50, align: 'center' });
doc.text('PRICE', 380, tableTop + 10, { width: 80, align: 'right' });
doc.text('TOTAL', 470, tableTop + 10, { width: 90, align: 'right' });
doc.moveTo(60, tableTop + 27).lineTo(540, tableTop + 27).strokeColor(lineColor).stroke();

// ✅ รายการสินค้า
doc.font('Helvetica').fillColor(textColor).fontSize(11);
let yPos = tableTop + 38;
let total = 0;

items.forEach((it) => {
  const price = parseFloat(it.price_each || 0);
  const subtotal = parseFloat(it.subtotal || 0);
  total += subtotal;

  doc.text(it.name, 70, yPos);
  doc.text(it.quantity.toString(), 300, yPos, { width: 50, align: 'center' });
  doc.text(price.toLocaleString('en-US', { minimumFractionDigits: 2 }), 380, yPos, { width: 80, align: 'right' });
  doc.text(subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), 470, yPos, { width: 90, align: 'right' });
  yPos += 20;
});

// ✅ Subtotal
doc.font('Helvetica-Bold').fillColor(mainColor).fontSize(12);
doc.text('SUBTOTAL', 380, yPos + 20, { width: 80, align: 'right' });
doc.text(total.toLocaleString('en-US', { minimumFractionDigits: 2 }), 470, yPos + 20, { width: 90, align: 'right' });

// ✅ ขอบล่าง: Thank you + DETAILS (ยืดหยุ่นตามตาราง)
const bottomY = yPos + 70;
doc.font('Helvetica-Bold').fillColor(mainColor).fontSize(11)
  .text('Thank you for giving us the opportunity to serve you.', 50, bottomY);

doc.moveDown(0.8);
doc.fontSize(10).fillColor(mainColor).font('Helvetica-Bold').text('DETAILS', 50);
doc.moveDown(0.3);
doc.font('Helvetica').fillColor(textColor);
doc.text(`Customer   ${info.firstname} ${info.lastname}`);
doc.text(`Email          ${info.email}`);
doc.text(`Phone         0628840577`);

// ✅ ปิด PDF
doc.end();
await new Promise(resolve => stream.on('finish', resolve));



    // 6. อัปเดต path ใน DB
    await db.promise().query(
      `UPDATE orders SET receipt_path = ? WHERE id = ?`,
      [`/uploads/receipts/${fileName}`, info.order_id]
    );

    // ✅ 7. ส่งเมลแนบใบเสร็จ
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chaploy.house@gmail.com',
        pass: 'rqfm hzup fivx ypbv'
      }
    });

    const mailOptions = {
      from: '"Chaploy Tea" <chaployshop@gmail.com>',
      to: info.email,
      subject: `Receipt for Order ${String(info.order_id).padStart(4, '0')}`,
      html: `
        <p>Dear ${info.firstname},</p>
        <p>Your payment has been verified successfully. Please find your receipt attached.</p>
        <p>Thank you for shopping with <b>Chaploy Tea</b> 🌿</p>
      `,
      attachments: [
        { filename: fileName, path: filePath }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error verifying payment:', err);
    res.status(500).json({ error: 'Error verifying payment' });
  }
});

router.post('/orders/update/:id', checkAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const [result] = await db.promise().query(
      `UPDATE orders SET order_status = ? WHERE id = ?`,
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Order not found.' });
    }

    console.log(`✅ Updated order ${orderId} to status: ${status}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating order status:', err);
    res.status(500).json({ success: false });
  }
});

// ================================
// 📨 [1] ยกเลิกออเดอร์โดย Admin + ส่งอีเมลแจ้งลูกค้า (Fixed & Complete)
// ================================
router.post('/orders/cancel/:id', checkAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason, note } = req.body;
    const adminName = req.session.user?.fullname || 'Admin';
    const staffId = req.session.user?.stfID || req.session.user?.id || null;

    console.log('🟢 Cancel request by Admin:', adminName);
    console.log('🟢 Cancelling order ID:', orderId);

    // ✅ ดึงข้อมูลลูกค้า
    const [[order]] = await db.promise().query(`
      SELECT 
        o.id, o.total, o.order_status, o.customer_id,
        c.firstname, c.lastname, c.email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // ✅ อัปเดตสถานะ + บันทึกคนยกเลิก
    await db.promise().query(`
      UPDATE orders
      SET order_status = 'cancelled',
          cancelled_by = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [staffId, orderId]);

    console.log(`🟢 Order ${orderId} cancelled successfully by ${adminName}`);

    // ✅ ส่งอีเมลแจ้งลูกค้า
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chaploy.house@gmail.com',
        pass: 'rqfm hzup fivx ypbv' // ✅ App Password
      }
    });

    const mailOptions = {
      from: '"Chaploy Premium Tea & Coffee" <chaploy.house@gmail.com>',
      to: order.email,
      subject: `Your Order ${String(order.id).padStart(4, '0')} Has Been Cancelled`,
      html: `
        <div style="font-family:'Quicksand',sans-serif;line-height:1.6;color:#2e4d39;">
          <p>Dear ${order.firstname},</p>
          <p>We regret to inform you that your order 
             <strong>#${String(order.id).padStart(4, '0')}</strong> 
             has been cancelled by our staff (${adminName}).</p>

          <p><strong>Reason:</strong> ${reason || 'Out of stock'}<br>
          <strong>Details:</strong> ${note || 'No additional details provided.'}</p>

          <p>If you have already made a payment, please contact our support team for a refund.</p>
          <p>Thank you for your understanding,<br>
          <strong>Chaploy Premium Tea & Coffee</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 Cancellation email sent to ${order.email}`);

    return res.json({ success: true, message: `Order cancelled by ${adminName} and email sent successfully.` });

  } catch (err) {
    console.error('❌ Error cancelling order (Admin):', err);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

// ✅ Cancel Order 
async function cancelOrder(orderId) {
  const result = await Swal.fire({
    title: 'Cancel this order?',
    text: 'Are you sure you want to cancel this order?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#43593E',
    cancelButtonColor: '#888',
    confirmButtonText: 'Yes, cancel it'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`/purchases/cancel/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    // 🟡 อ่านเป็น text ก่อน
    const text = await res.text();
    console.log('📦 Raw response:', text);

    // 🟢 พยายาม parse JSON ถ้าได้
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.warn('⚠️ Response was not valid JSON, showing success fallback');
    }

    // 🟢 ถ้าสถานะ HTTP เป็น 200 แปลว่าสำเร็จ
    if (res.ok && (data.success || text.includes('success'))) {
      await Swal.fire({
        icon: 'success',
        title: 'Order Cancelled',
        text: 'Your order has been cancelled successfully.',
        confirmButtonColor: '#43593E'
      });
      return window.location.reload();
    }

    // 🔴 ถ้าไม่ ok
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: data.message || 'Failed to cancel this order.',
      confirmButtonColor: '#43593E'
    });
  } catch (err) {
    console.error('❌ Fetch error:', err);
    Swal.fire({
      icon: 'error',
      title: 'Server Error',
      text: 'Something went wrong while cancelling the order.',
      confirmButtonColor: '#43593E'
    });
  }
}

// ================================
// 🚪 Logout
// ================================
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.redirect('/admin/dashboard');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;

