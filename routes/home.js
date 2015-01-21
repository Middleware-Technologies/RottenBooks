var express = require('express');
var router = express.Router();

/* GET HOME PAGE */
router.get('/', function(req, res) {
    res.render('index', { titolo: 'Welcome To RottenBooks' , films : []});
});

module.exports = router;
