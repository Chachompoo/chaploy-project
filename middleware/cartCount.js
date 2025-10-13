// ✅ middleware/cartCount.js
module.exports = (req, res, next) => {
  const cart = req.session.cart || [];
  // รวมจำนวน qty ทั้งหมดในตะกร้า
  res.locals.cartCount = cart.reduce((sum, i) => sum + (i.qty || 0), 0);
  next();
};
