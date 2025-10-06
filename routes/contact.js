var express = require('express');
var router = express.Router();

/* GET contact page. */
router.get('/', function(req, res, next) {
  res.render('contact'); // ให้ render views/contact.ejs
});

module.exports = router;
