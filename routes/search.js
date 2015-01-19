var express = require('express');
var router = express.Router();
var http = require('http');
var querystring = require('querystring');
var cheerio = require('cheerio');
var gBooks = require('google-books-search');
var async = require('async')
var app = express();

//VARIABILI PER PRODURRE PATH DI RICHIESTA
var partialQueryMovie = '/api/public/v1.0/movies.json?apikey=';
var apiKeyMovie = 'xxcrmh8fb44ab9qukqr9426d';
var hostMovie = 'api.rottentomatoes.com';
var queryTermMovie = "";
var queryPage = 1;
var queryPageLimit = 5;

//VARIABILI PER RICHIESTA IMDB
var hostIMDB = 'www.imdb.com';
var pathIMDB = '/title/tt_ID/literature';

function film(data) {
    data.posters.detailed = data.posters.detailed.replace('_tmb', '_det');
    data.posters.original = data.posters.original.replace('_tmb', '_ori');

    this.title = data.title;
    this.year = data.year;
    this.criticsScore = data.ratings.critics_score;
    this.audienceScore = data.ratings.audience_score;
    this.posters = data.posters;
    var alternate_ids = data.alternate_ids || {};
    this.imdb = alternate_ids.imdb;
    this.books = []
}

function Book(data) {
    this.title = data.title;
    this.link = data.infoLink;
    this.thumbnail = data.thumbnail;
}

function httpGetMovie(response)
{
    var fullRequestQueryMovie = partialQueryMovie + apiKeyMovie;
    fullRequestQueryMovie += '&' + querystring.stringify({q:queryTermMovie, page_limit: queryPageLimit, page: queryPage});

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
        function (res) {
            var jsonStringResponseMovie = '';
            console.log("statusCode: ", res.statusCode);

            res.on('data', function (piece) {
                jsonStringResponseMovie += piece;
            });

            res.on('end', function () {
                var content = JSON.parse(jsonStringResponseMovie);
                var films = [];

                for (var i = 0; i < content.movies.length; i++) {
                    films[i] = new film(content.movies[i]);
                }

                async.each(films,
                    function(film, callback) {
                        //GO LOOK FOR THE BOOK
                        if (film.imdb) {
                            var optionsIMDB =
                            {
                                host: hostIMDB,
                                path: pathIMDB.replace('_ID', film.imdb),
                                method: 'GET'
                            };

                            console.log("SCRAPE: "+ optionsIMDB.host + optionsIMDB.path);

                            var reqIMDB = http.request(optionsIMDB,
                                function (resIMDB) {
                                    var IMDBStringResponse = '';

                                    resIMDB.on('data', function (piece) {
                                        IMDBStringResponse += piece;
                                    });

                                    resIMDB.on('end', function () {
                                        var contentIMDB = cheerio.load(IMDBStringResponse);
                                        var originalBooks = contentIMDB('*').filter(function () {
                                            return contentIMDB(this).text() === 'Original Literary Source';
                                        })[0];
                                        var originalBook = extractBookInfo(originalBooks);
                                        if (originalBook) {
                                            console.log("Searching for book: "+originalBook.title+" by "+originalBook.author);
                                            gBooks.search('', {
                                                fields: {
                                                    title: originalBook.title,
                                                    author: originalBook.author
                                                }
                                            }, function (error, results) {
                                                if (!error) {
                                                    film.books = [];
                                                    console.log("Found "+results.length+" books for "+film.title);
                                                    for (var j = 0; j < results.length; j++) {
                                                        film.books[j] = new Book( results[j] );
                                                    }
                                                } else {
                                                    console.log(error);
                                                }
                                                callback();
                                            });
                                        } else {
                                            callback();
                                        }
                                    });
                                });

                            reqIMDB.on('error', function (e) {
                                console.error("REQUEST TO IMDB FAILED");
                                console.error(e);
                                callback();
                            });

                            reqIMDB.end();
                        }
                        else {
                            callback();
                        }
                    },
                    function(err) {
                        console.log("Async finished!");
                        if(!err) {
                            response.json({
                                films: films,
                                query: queryTermMovie,
                                page: queryPage,
                                pages: numPages
                            });
                        } else {
                            console.log(err);
                        }
                    });



                var numPages = Math.ceil(content.total/queryPageLimit);

            });

            res.on('error', function(e) {
                console.error(e);
            });

        });
    req.end();
}

/* GET HOME PAGE */
router.post('/', function(req, res)
{
    //res.render('index',{ title: 'Welcome To Home Page',cerca: 'Cercato '+ req.body.query})
    //FORMA LA PARTE DI QUERY q:Title
    console.log('POST QUERY: ' + req.body.query);
    queryTermMovie = req.body.query;
    queryPage = 1;
    httpGetMovie(res);
});

router.get('/', function (req, res) {
    if (typeof req.query.q == 'undefined') {
        var err = new Error('Not Found');
        err.status = 404;
        res.status('404').render('error', {message: err.message, error: err});
    }

    queryTermMovie = req.query.q;

    if (typeof req.query.page != 'undefined') {
        queryPage = req.query.page;
    } else {
        queryPage = 1;
    }

    console.log('GET QUERY: ' + queryTermMovie + ' (page ' + queryPage + ')');

    httpGetMovie(res);

});

function cleanString(str) {
    // taken from http://stackoverflow.com/a/26482552/4077047
    // removes special characters by checking if they remain the same uppercase or lowercase...GENIUS!
    var lower = str.toLowerCase();
    var upper = str.toUpperCase();
    var res = "";
    for(var i=0; i<lower.length; ++i) {
        if(lower[i] != upper[i] || lower[i] === ' '){
            res += str[i];
        }
    }
    return res;
}

function extractBookInfo(htmlNode) {

    if(!htmlNode){
        return null;
    }

    var out = null;
    var title;

    //CYCLE FOR TITLE BETWEEN QUOTES
    var next = htmlNode.next;
    while(next) {
        if(next['type']==='tag' && next['name']==='br') {
            next = next.next; //lol
            continue;
        }
        if(next['type']!=='text') {
            break;
        }
        var str = next['data']
        var title = str.match(/"([^"]+)"/);
        if(title){
            var regex = new RegExp(".+?(?="+title[0]+")")
            title = title[1];
            out = {
                title: cleanString(title),
                author: cleanString(str.match(regex)[0])
            }
        }
        next = next.next; //lol
    }

    return out;
}

module.exports = router;