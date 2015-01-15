var express = require('express');
var router = express.Router();
var http = require('http');
var querystring = require('querystring');



//VARIABILI PER PRODURRE PATH DI RICHIESTA
var partialQueryMovie = '/api/public/v1.0/movies.json?apikey=';
var apiKeyMovie = 'xxcrmh8fb44ab9qukqr9426d';
var hostMovie = 'api.rottentomatoes.com';
var queryTermMovie="";

function film(data) {
    this.title = data.title;
    this.year = data.year;
    this.criticsScore = data.ratings.critics_score;
    this.audienceScore = data.ratings.audience_score;
    this.poster = data.posters.original.replace('_tmb', '_ori');
}

function httpGetMovie(response)
{
    var fullRequestQueryMovie = partialQueryMovie + apiKeyMovie + '&' + queryTermMovie + '&page_limit=8';
    console.log('CALL: ' + hostMovie+ fullRequestQueryMovie);

    var headersMovie =
    {
        'Content-Type': 'application/json'
    };
    var optionsMovie =
    {
        host: hostMovie,
        path: fullRequestQueryMovie,
        method: 'GET',
        headers: headersMovie
    };

    var req = http.request(optionsMovie,
        function(res)
        {
            var jsonStringResponseMovie = '';
            console.log("statusCode: ", res.statusCode);

            res.on('data', function(piece) {
                jsonStringResponseMovie += piece;
            });

            res.on('end', function()
            {
                var content = JSON.parse(jsonStringResponseMovie);

                var films=[];

                for (var i = 0; i < content.movies.length; i++) {
                    films[i] = new film(content.movies[i]);
                }
                
                response.render('index',{titolo: 'Welcome To RottenBooks' ,
                                         cerca: 'Trovati: '+ content.total,
                                         films: films});
            });

            req.on('error', function(e) {
                console.error(e);
            });

        });
    req.end();


}

/* GET HOME PAGE */
router.post('/', function(req, res)
{
    //res.render('index',{ title: 'Welcome To Home Page',cerca: 'Cercato '+ req.body.user})
    //FORMA LA PARTE DI QUERY q:Title
    console.log('RICHIESTA: ' + req.body.user);
    queryTermMovie = querystring.stringify({q:req.body.user});
    httpGetMovie(res);
});


module.exports = router;