const db = require('../db');

module.exports = async (req, res, next) => {
  try {
    const cart = req.session.cart || [];
    let cartPreview = [];
    let totalMini = 0;

    if (cart.length > 0) {
      const ids = cart.map(i => i.id);
      const [rows] = await db.promise().query(
        `SELECT id, name, price, image FROM products WHERE id IN (?)`,
        [ids]
      );

      cartPreview = rows.map(p => {
        const item = cart.find(i => i.id == p.id);
        const qty = item ? item.qty : 0;
        totalMini += p.price * qty;
        return { ...p, qty };
      });
    }

    // 🟢 ส่งตัวแปรให้ ejs ใช้ได้ทุกหน้า
    res.locals.cartPreview = cartPreview;
    res.locals.totalMini = totalMini;

    next();
  } catch (err) {
    console.error('❌ Navbar Data Error:', err);
    next();
  }
};
