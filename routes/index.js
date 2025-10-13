var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Chaploy' }); // Your existing home page route
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login'); // Render the login.ejs file
});

/* GET register page. */ 
router.get('/register', function(req, res, next) {
  res.render('register'); // Render the register.ejs file
});

router.get('/', (req, res) => {
  res.render('index', {
    title: 'Chaploy',
    user: req.session.user || null,
    cartCount: (req.session.cart || []).reduce((sum, i) => sum + i.qty, 0)
  });
});


module.exports = router;
