const express = require('express');
const router = express.Router();
const db = require('../db');
const checkAdmin = require('../middleware/checkAdmin');
const multer = require('multer');
const path = require('path');

// ✅ หน้าเมนูหลักของแอดมิน
router.get('/', checkAdmin, (req, res) => {
  res.render('admin/index', {
    title: 'Admin Panel',
    user: req.session.user
  });
});

// ✅ ตั้งค่า multer สำหรับอัปโหลดรูปสินค้า
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/products'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// 🟢 [1] แสดงรายการสินค้า
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


// 🟢 [2] หน้าเพิ่มสินค้า
router.get('/products/add', checkAdmin, (req, res) => {
  db.query('SELECT * FROM categories', (err, categories) => {
    if (err) throw err;
    res.render('admin/add_product', { categories });
  });
});

// บันทึกสินค้าใหม่
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


// 🟢 [3] หน้าแก้ไขสินค้า
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

// อัปเดตสินค้า
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

// 🗑 [4] ลบสินค้า
router.get('/products/delete/:id', checkAdmin, (req, res) => {
  const sql = 'DELETE FROM products WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/admin/products');
  });
});

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

// 🟢 [5] เพิ่มแอดมินใหม่ (AJAX)
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

      res.json({
        success: true,
        message: 'Admin added successfully',
        data: { fullname, email, username, role: 'admin' }
      });
    });
  } catch (error) {
    console.error('❌ Hash Error:', error);
    res.json({ success: false, message: 'Server error' });
  }
});


// 🧑‍💼 [Employee Page]
router.get('/employee', checkAdmin, (req, res) => {
  const sql = 'SELECT * FROM staff ORDER BY stfID DESC';
  db.query(sql, (err, employees) => {
    if (err) throw err;
    res.render('admin/employee', { employees });
  });
});

router.get('/dashboard', checkAdmin, (req, res) => {
  const summary = {};
  const chartData = {};

  const queries = {
    totalProducts: 'SELECT COUNT(*) AS total FROM products',
    activeProducts: "SELECT COUNT(*) AS active FROM products WHERE status = 'active'",
    inactiveProducts: "SELECT COUNT(*) AS inactive FROM products WHERE status = 'inactive'",
    coffeeCount: "SELECT COUNT(*) AS coffee FROM products p JOIN categories c ON p.categories_id = c.id WHERE c.name = 'Coffee'",
    teaCount: "SELECT COUNT(*) AS tea FROM products p JOIN categories c ON p.categories_id = c.id WHERE c.name = 'Tea'",
    employeeCount: 'SELECT COUNT(*) AS employees FROM staff',
    productsByCategory: `
      SELECT c.name AS category, COUNT(p.id) AS count
      FROM products p
      JOIN categories c ON p.categories_id = c.id
      GROUP BY c.name
    `
  };

  db.query(queries.totalProducts, (err, total) => {
    if (err) throw err;
    summary.totalProducts = total[0].total;

    db.query(queries.activeProducts, (err, active) => {
      if (err) throw err;
      summary.activeProducts = active[0].active;

      db.query(queries.inactiveProducts, (err, inactive) => {
        if (err) throw err;
        summary.inactiveProducts = inactive[0].inactive;

        db.query(queries.coffeeCount, (err, coffee) => {
          if (err) throw err;
          summary.coffeeCount = coffee[0].coffee;

          db.query(queries.teaCount, (err, tea) => {
            if (err) throw err;
            summary.teaCount = tea[0].tea;

            db.query(queries.employeeCount, (err, emp) => {
              if (err) throw err;
              summary.employeeCount = emp[0].employees;

              // ดึงข้อมูลกราฟ
              db.query(queries.productsByCategory, (err, chartResults) => {
                if (err) throw err;

                chartData.labels = chartResults.map(row => row.category);
                chartData.values = chartResults.map(row => row.count);

                res.render('admin/dashboard', { summary, chartData });
              });
            });
          });
        });
      });
    });
  });
});




module.exports = router;
