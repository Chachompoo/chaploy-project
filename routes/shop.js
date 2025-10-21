const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ✅ ย้าย middleware ตัวนี้ขึ้นมาบนสุดเลย
router.use((req, res, next) => {
  if (!req.session.user) {
    req.session.cart = [];
    res.clearCookie('savedCart');
  }
  next();
});

// ==========================
// 🛒 แสดงสินค้าทั้งหมด
// ==========================
router.get('/all', async (req, res) => {
  try {
    const rawCategory = req.query.category || 'ALL';
    const category = decodeURIComponent(rawCategory.trim()); // ✅ แก้จุดนี้
    const search = req.query.q ? `%${req.query.q}%` : '%';

    let sql = `
      SELECT 
        p.id, p.name, p.price, p.image, p.stock, p.status, c.name AS category
      FROM products p
      LEFT JOIN categories c ON p.categories_id = c.id
      WHERE p.name LIKE ?
    `;
    const params = [search];

    if (category !== 'ALL') {
      sql += ' AND c.name = ?';
      params.push(category);
    }

    const [products] = await db.promise().query(sql, params);
    const [categories] = await db.promise().query(`SELECT name, description FROM categories ORDER BY name ASC`);
    const totalProducts = products.length;

    // ✅ ดึง description ของ category (ไว้แสดงด้านบน)
    const activeCategoryInfo = categories.find(cat => cat.name === category);

    res.render('shop/allProducts', {
      title: 'All Products - Chaploy',
      products,
      categories,
      activeCategory: category,
      activeCategoryInfo, // ✅ ส่งคำอธิบายไปด้วย
      searchQuery: req.query.q || '',
      totalProducts,
      user: req.session.user || null,
      cartCount: (req.session.cart || []).reduce((sum, i) => sum + i.qty, 0)
    });
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).send('Internal Server Error');
  }
});



// ==========================
// 📦 รายละเอียดสินค้า
// ==========================
router.get('/product/:id', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).render('error', { message: 'Product not found' });
    }

    const product = rows[0];
    res.render('shop/product', {
      title: product.name,
      product,
      user: req.session.user || null,
      cartCount: (req.session.cart || []).reduce((sum, i) => sum + i.qty, 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// ==========================
// 🧺 ตะกร้าสินค้า
// ==========================
router.get('/basket', async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      return res.render('shop/basket', {
        title: 'Your Basket',
        products: [],
        total: 0,
        user: req.session.user || null,
        cartCount: 0
      });
    }

    const ids = cart.map(item => item.id);
    const [rows] = await db.promise().query(
      `SELECT id, name, image, price FROM products WHERE id IN (?)`,
      [ids]
    );

    const products = rows.map(p => {
      const item = cart.find(c => c.id == p.id);
      return {
        ...p,
        price: Number(p.price),
        qty: item.qty
      };
    });

    const total = products.reduce((sum, item) => sum + item.price * item.qty, 0);

    res.render('shop/basket', {
      title: 'Your Basket',
      products,
      total,
      user: req.session.user || null,
      cartCount: (req.session.cart || []).reduce((sum, i) => sum + i.qty, 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// ==========================
// ➕➖ ปรับจำนวนสินค้า
// ==========================
router.post('/cart/update', async (req, res) => {
  const { productId, action } = req.body;
  if (!req.session.cart) req.session.cart = [];

  const item = req.session.cart.find(i => i.id == productId);
  if (!item) return res.json({ success: false, message: "Item not found" });

  try {
    const [rows] = await db.promise().query('SELECT stock FROM products WHERE id = ?', [productId]);
    if (rows.length === 0) return res.json({ success: false, message: "Product not found" });
    const stock = rows[0].stock;

    if (action === 'plus') {
      if (item.qty >= stock) {
        return res.json({ success: false, message: "Out of stock" });
      }
      item.qty += 1;
    }

    if (action === 'minus') {
      item.qty -= 1;
      if (item.qty <= 0) {
        req.session.cart = req.session.cart.filter(i => i.id != productId);
      }
    }

    const count = req.session.cart.reduce((sum, i) => sum + i.qty, 0);
    req.session.save(() => {
      res.cookie("savedCart", JSON.stringify(req.session.cart), {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: false
      });
      res.json({ success: true, count });
    });

  } catch (err) {
    console.error("❌ Stock check error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// 🗑 ลบสินค้าออกจากตะกร้า
// ==========================
router.post('/cart/remove', (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter(item => item.id != productId);
  const count = req.session.cart.reduce((sum, i) => sum + i.qty, 0);

  req.session.save(() => {
    res.cookie("savedCart", JSON.stringify(req.session.cart), {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false
    });
    res.json({ success: true, count });
  });
});

// ==========================
// 🛍 เพิ่มสินค้าลงตะกร้า (เวอร์ชันกันสินค้าหมด)
// ==========================
router.post('/cart/add', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ loginRequired: true });
  }

  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  try {
    // ✅ ดึงข้อมูลสินค้าจากฐานข้อมูล
    const [[product]] = await db.promise().query(
      'SELECT id, name, price, stock FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    // 🚫 ถ้าหมดสต็อก — ห้ามเพิ่มลงตะกร้า
    if (product.stock <= 0) {
      return res.json({ success: false, message: `${product.name} is out of stock.` });
    }

    // ✅ เพิ่มสินค้าใน session.cart
    const existing = req.session.cart.find(item => item.id == productId);
    if (existing) {
      // ถ้าเกินจำนวน stock — ห้ามเพิ่มอีก
      if (existing.qty >= product.stock) {
        return res.json({ success: false, message: "Out of stock" });
      }
      existing.qty += 1;
    } else {
      req.session.cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        qty: 1
      });
    }

    // ✅ คำนวณยอดรวมสินค้าในตะกร้า
    const count = req.session.cart.reduce((sum, i) => sum + i.qty, 0);

    res.cookie('savedCart', JSON.stringify(req.session.cart), {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: false
    });

    res.json({ success: true, count });
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ==========================
// 💳 ระบบ Checkout
// ==========================
const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '../public/uploads/slips');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `slip_${Date.now()}${ext}`);
  }
});
const uploadSlip = multer({ storage: slipStorage });

// --------------------------
// 📋 แสดงหน้า Checkout
// --------------------------
router.get('/checkout', async (req, res) => {
  const cart = Array.isArray(req.session.cart) ? req.session.cart : [];
  if (cart.length === 0) return res.redirect('/shop/basket');

  const ids = cart.map(i => i.id);
  const [rows] = await db.promise().query('SELECT id, name, price FROM products WHERE id IN (?)', [ids]);

  const mergedCart = rows.map(p => {
    const item = cart.find(i => i.id == p.id);
    return { ...p, qty: item.qty, price: Number(p.price) };
  });

  const subtotal = mergedCart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingFee = 0;
  const total = subtotal + shippingFee;

  res.render('shop/payment', {
    title: 'Payment - Chaploy',
    user: req.session.user || null,
    cart: mergedCart,
    subtotal,
    shippingFee,
    total
  });
});

// ==========================
// ✅ แสดงหน้า Payment Success
// ==========================
router.get('/payment-success', async (req, res) => {
  try {
    const orderId = req.query.orderId;

    if (!orderId) {
      return res.status(400).send('Missing order ID');
    }

    // ดึงข้อมูล order และ customer มาด้วย
    const [rows] = await db.promise().query(`
      SELECT 
        o.id AS order_id,
        o.total,
        o.payment_status,
        o.order_status,
        o.created_at,
        CONCAT(c.firstname, ' ', c.lastname) AS customer_name,
        c.email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
      LIMIT 1
    `, [orderId]);

    if (rows.length === 0) {
      return res.status(404).render('error', { message: 'Order not found' });
    }

    const order = rows[0];

    res.render('shop/payment_success', {
      title: 'Payment Successful',
      orderId,
      order,
      user: req.session.user || null
    });
  } catch (err) {
    console.error('❌ Error loading payment success:', err);
    res.status(500).send('Internal Server Error');
  }
});



// 💳 เมื่อกด Confirm Payment (POST)
router.post('/checkout', uploadSlip.single('slip'), async (req, res) => {
  const cart = Array.isArray(req.session.cart) ? req.session.cart : [];
  if (cart.length === 0) return res.redirect('/shop/basket');

  const { fullName, address, phone, email } = req.body;
  const slipFile = req.file;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1) เตรียม customer (แยกชื่อ/นามสกุล และ upsert ลง customers)
    const [firstname, ...rest] = (fullName || '').trim().split(' ');
    const lastname = rest.join(' ');
    let customerId = req.session.user?.customer_id || null;

    if (!customerId) {
      // หา customer จากอีเมล ถ้าไม่มีให้สร้างใหม่
      const [found] = await conn.query(
        'SELECT id FROM customers WHERE email = ? LIMIT 1',
        [email]
      );
      if (found.length) {
        customerId = found[0].id;
      } else {
        const [insCus] = await conn.query(
          `INSERT INTO customers (firstname, lastname, email, phone, address, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [firstname || null, lastname || null, email || null, phone || null, address || null]
        );
        customerId = insCus.insertId;
      }
    }

    // 2) ดึงราคา "ล่าสุด" จาก DB ตาม product ids เพื่อกันเคสที่ cart ไม่มีราคา/ราคาเก่า
    const ids = cart.map(i => i.id);
    const [rows] = await conn.query(
      'SELECT id, name, price FROM products WHERE id IN (?)',
      [ids.length ? ids : [0]]
    );
    // รวม qty จาก cart เข้ากับราคา/ชื่อจาก DB
    const merged = rows.map(p => {
      const item = cart.find(i => i.id == p.id);
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        qty: Number(item?.qty) || 0
      };
    });

    // 3) คำนวณยอด
    const subtotal = merged.reduce((s, i) => s + (i.price * i.qty), 0);
    const shippingFee = 0;                 // ปรับได้ตามจริง
    const total = Number(subtotal + shippingFee); // เก็บเป็น number ใน DB

    // 4) สร้าง order
    const [orderInsert] = await conn.query(
      `INSERT INTO orders
       (customer_id, total, payment_status, order_status, payment_method,
        shipping_address, phone, email, created_at)
       VALUES (?, ?, 'pending', 'pending', 'bank', ?, ?, ?, NOW())`,
      [customerId, total, address, phone, email]
    );
    const orderId = orderInsert.insertId;

    // 5) บันทึกรายการสินค้า
    for (const it of merged) {
      if (!it.qty) continue;
      const lineSubtotal = it.price * it.qty;
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_each, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, it.id, it.qty, it.price, lineSubtotal]
      );
    }

    // 6) บันทึกการชำระเงิน (pending)
    const slipRelPath = slipFile ? `/uploads/slips/${slipFile.filename}` : null;
    await conn.query(
      `INSERT INTO payments (order_id, amount, method, slip_image, status, email, payment_date)
       VALUES (?, ?, 'bank', ?, 'pending', ?, NOW())`,
      [orderId, total, slipRelPath, email]
    );

    await conn.commit();

    // 7) เคลียร์ตะกร้า
    req.session.cart = [];
    res.clearCookie('savedCart');

    // 8) ไปหน้า success
    res.redirect(`/shop/payment-success?orderId=${orderId}`);
  } catch (err) {
    await conn.rollback();
    console.error('Payment error:', err);
    if (slipFile) { try { fs.unlinkSync(slipFile.path); } catch {} }
    res.status(500).send('Internal Server Error');
  } finally {
    conn.release();
  }
});


module.exports = router;
