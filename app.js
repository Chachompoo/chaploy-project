var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var registerRouter = require('./routes/register');
var loginRouter = require('./routes/login');
var contactRouter = require('./routes/contact');
var resetRouter = require('./routes/reset');


var app = express();

// --- ตั้งค่า Middleware ---
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ ต้องมาก่อน routes ทั้งหมด
app.use(session({
  secret: 'chaploy-secret-key',
  resave: false,
  saveUninitialized: false
}));

// ✅ ทำให้ `user` ใช้ได้ในทุก ejs
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- routes ---
app.use('/', indexRouter);
app.use('/Users', usersRouter);
app.use('/Register', registerRouter);
app.use('/Login', loginRouter);
app.use('/Contact', contactRouter);
app.use('/reset', resetRouter);
app.use('/reset-password', resetRouter);



// ✅ Signout
app.get('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// catch 404
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
