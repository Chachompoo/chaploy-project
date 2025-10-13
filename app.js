// ================================
// 🌿 CHAPLOY — Main App.js
// ================================

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// --- Routers ---
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var registerRouter = require('./routes/register');
var loginRouter = require('./routes/login');
var contactRouter = require('./routes/contact');
var resetRouter = require('./routes/reset');
var adminRouter = require('./routes/admin');
var shopRouter = require('./routes/shop');

// --- Middlewares ---
var cartCount = require('./middleware/cartCount');
var cartCookie = require('./middleware/cartCookie');
const { setupSession, setUser } = require('./middleware/sessionUser');
const navbarData = require('./middleware/navbarData');

// --- App Init ---
var app = express();

// ================================
// 🧩 GLOBAL MIDDLEWARE
// ================================
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ✅ Serve static files (CSS / JS / Images)
app.use(express.static(path.join(__dirname, 'public')));

// ================================
// 🧠 SESSION & USER HANDLING
// ================================
app.use(setupSession);
app.use(setUser);

// ✅ Load cart from cookies (safe)
app.use(cartCookie);

// ✅ Count cart items
app.use(cartCount);

// ✅ Ensure categories available everywhere
app.use(async (req, res, next) => {
  if (!res.locals.categories) res.locals.categories = [];
  next();
});

// ✅ Navbar categories
app.use(navbarData);

// ================================
// 🎨 VIEW ENGINE
// ================================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ================================
// 🚏 ROUTES
// ================================
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/contact', contactRouter);
app.use('/reset', resetRouter);
app.use('/admin', adminRouter);
app.use('/shop', shopRouter);

// ================================
// 🧹 DEBUG TOOL (optional)
// ================================
app.get('/debug/clear-cart-cookie', (req, res) => {
  res.clearCookie('savedCart');
  res.send('✅ cleared savedCart cookie');
});

// ================================
// 🚪 SIGN OUT
// ================================
app.get('/signout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// ================================
// ❌ ERROR HANDLING
// ================================
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
