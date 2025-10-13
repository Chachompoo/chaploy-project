// middleware/cartCookie.js
module.exports = (req, res, next) => {
  try {
    if (req.cookies && req.cookies.savedCart) {
      req.session.cart = JSON.parse(req.cookies.savedCart);
    } else {
      if (!req.session.cart) req.session.cart = [];
    }
  } catch (err) {
    console.error('❌ Error parsing savedCart cookie:', err);
    req.session.cart = [];
  }
  next();
};
