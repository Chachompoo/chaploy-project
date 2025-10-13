const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ แสดงสินค้าทั้งหมด
router.get('/all', async (req, res) => {
  try {
    const [products] = await db.promise().query(`
      SELECT id, name, price, image, stock, status
      FROM products
      ORDER BY created_at DESC
    `);

    res.render('shop/allProducts', {
  title: 'All Products - Chaploy',
  products,
  user: req.session.user || null,
  cartCount: (req.session.cart || []).reduce((sum, i) => sum + i.qty, 0)
});


  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ✅ แสดงสินค้ารายละเอียด
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
// ✅ แสดงตะกร้าสินค้า
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

    // รวมราคาทั้งหมด
    // ✅ แปลงราคาให้เป็น number ก่อนคำนวณเสมอ
    const products = rows.map(p => {
  const item = cart.find(c => c.id == p.id);
  return {
    ...p,
    price: Number(p.price), // ✅ แปลงให้เป็น number
    qty: item.qty
  };
});

    const total = products.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

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

// ✅ ปรับจำนวนสินค้า (+ / -)
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

    // ✅ ต้อง save ก่อนตอบ
    req.session.save(() => {
      // ✅ Sync cart ลง cookie ด้วย (เก็บ 30 วัน)
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

// ✅ ลบสินค้าออกจากตะกร้า
router.post('/cart/remove', (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  // ✅ ต้องใช้ item.id ไม่ใช่ id ตรง ๆ
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



// ✅ ลบสินค้าออกจากตะกร้า (AJAX)
router.post('/cart/remove', (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter(id => id != productId);
const count = req.session.cart.reduce((sum, i) => sum + i.qty, 0);
    res.json({ success: true, count });
});

// ✅ เพิ่มสินค้าลงตะกร้า (ใช้ session)
router.post('/cart/add', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ loginRequired: true });
  }

  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  // ✅ ตรวจว่ามีสินค้านี้อยู่ในตะกร้าแล้วไหม
  const existing = req.session.cart.find(item => item.id == productId);
  if (existing) {
    existing.qty += 1;
  } else {
    req.session.cart.push({ id: productId, qty: 1 });
  }

    res.cookie('savedCart', JSON.stringify(req.session.cart), {
    maxAge: 7 * 24 * 60 * 60 * 1000, // อยู่ได้ 7 วัน
    httpOnly: false // ให้ฝั่ง client อ่านได้ (เช่นตอน reload)
  });

  const count = req.session.cart.reduce((sum, i) => sum + i.qty, 0);
  res.json({ success: true, count });
});

module.exports = router;
