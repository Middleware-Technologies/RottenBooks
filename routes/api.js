/**
 * Created by Francesco Nero on 1/19/15.
 */

var express = require('express');
var router = express.Router();
var utils = require('../logic/utils');


router.get('/movies', function(req, res){
    if (typeof req.query == 'undefined') {
        var err = new Error('Not Found');
        err.status = 404;
        res.status('404').json({message: err.message, error: err});
    } else {
        console.log('GET QUERY: ');
        utils.httpGetMovie(res, req.query);
    }
});

module.exports = router;