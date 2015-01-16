var express = require('express');
var router = express.Router();
var http = require('http');
var querystring = require('querystring');
var cheerio = require('cheerio');
var books = require('google-books-search')

//VARIABILI PER PRODURRE PATH DI RICHIESTA
var partialQueryMovie = '/api/public/v1.0/movies.json?apikey=';
var apiKeyMovie = 'xxcrmh8fb44ab9qukqr9426d';
var hostMovie = 'api.rottentomatoes.com';
var queryTermMovie="";

//VARIABILI PER RICHIESTA IMDB
var hostIMDB = 'www.imdb.com'
var pathIMDB = '/title/tt_ID/literature'

function film(data) {
    data.posters.detailed = data.posters.detailed.replace('_tmb', '_det')
    data.posters.original = data.posters.original.replace('_tmb', '_ori')

    this.title = data.title;
    this.year = data.year;
    this.criticsScore = data.ratings.critics_score;
    this.audienceScore = data.ratings.audience_score;
    this.posters = data.posters;
    alternate_ids = data.alternate_ids || {};
    this.imdb = alternate_ids.imdb
}

function Book(data) {
    this.title = data.title
    this.link = data.link
    this.thumbnail = data.thumbnail
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
                    console.log(films[i])

                    //GO LOOK FOR THE BOOK
                    if(films[i].imdb) {
                        var optionsIMDB =
                        {
                            host: hostIMDB,
                            path: pathIMDB.replace('_ID', films[i].imdb),
                            method: 'GET'
                        };
                        console.log(optionsIMDB.host+optionsIMDB.path)

                        var reqIMDB = http.request(optionsIMDB,
                            function (resIMDB) {
                                var IMDBStringResponse = '';

                                resIMDB.on('data', function (piece) {
                                    IMDBStringResponse += piece;
                                });

                                resIMDB.on('end', function () {
                                    var contentIMDB = cheerio.load(IMDBStringResponse);
                                    var originalBook = contentIMDB('*').filter(function(i, el) {
                                        return contentIMDB(this).text() === 'Original Literary Source';
                                    })[0]
                                    if(originalBook){
                                        var author = originalBook.next['data'].match(/([^"]+)"/)[1]
                                        var title = originalBook.next['data'].match(/"([^"]+)"/)[1]
                                        console.log(author)
                                        console.log(title)
                                        books.search(title, function(error, results) {
                                            if ( ! error ) {
                                                console.log(results);
                                            } else {
                                                console.log(error);
                                            }
                                        });
                                    }
                                });
                            });
                        reqIMDB.on('error', function(e) {
                            console.error("REQUEST TO IMDB FAILED")
                            console.error(e);
                        });
                        reqIMDB.end();
                    }
                }
                
                response.render('index',{titolo: 'Welcome To RottenBooks' ,
                                         cerca: 'Trovati: '+ content.total,
                                         films: films});
            });


        });

    req.on('error', function(e) {
        console.error(e);
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