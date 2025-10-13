const session = require('express-session');

module.exports = {
  setupSession: session({
    secret: 'chaploy-secret-key',
    resave: false,
    saveUninitialized: false,
  }),

  setUser: (req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
  }
};

module.exports = {
  setupSession: session({
    secret: 'chaploy-secret-key',
    resave: false,
    saveUninitialized: false,
  }),

  setUser: (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cartCount = (req.session.cart || []).length; // ✅ เพิ่มตรงนี้
    next();
  }
};

