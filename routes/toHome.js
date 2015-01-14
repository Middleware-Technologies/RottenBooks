var express = require('express');
var router = express.Router();

/* GET HOME PAGE */
router.get('/', function(req, res) {
    res.render('index', { title: 'Welcome To Home Page' });
});

module.exports = router;
