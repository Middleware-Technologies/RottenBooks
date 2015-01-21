var express = require('express');
var http = require('http');
var querystring = require(('querystring'));

var router = express.Router();
var headersMovie = { 'Content-Type': 'application/json' };

var queryPageLimit = 5;

router.get('/', function(req, res){
    var optionsMovie =
    {
        host: 'localhost',
        port: 3000,
        path: '/api/movies?'+querystring.stringify(req.query),
        headers: headersMovie
    };
    var JSONResponse = '';

    http.get(optionsMovie, function(wsRes){
        wsRes.on('data', function(data){
            JSONResponse += data;
        });
        wsRes.on('end', function(){
            if(wsRes.statusCode>=200 && wsRes.statusCode <300){
                var content = JSON.parse(JSONResponse);
                res.render('index', content);
            } else {
                res.render('error', {message:"Ooops!", error:{ status: "Returned status code:", stack: wsRes.statusCode }});
            }
        });
    }).on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

});

module.exports = router;