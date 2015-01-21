/**
 * Created by Francesco Nero on 1/19/15.
 */

var Film = require('../models/Film');
var Book = require('../models/Book');

var querystring = require('querystring');
var gBooks = require('google-books-search');
var cheerio = require('cheerio');
var async = require('async');
var http = require('http');

//VARIABILI PER PRODURRE PATH DI RICHIESTA
var partialQueryMovie = '/api/public/v1.0/movies.json?apikey=';
var apiKeyMovie = 'xxcrmh8fb44ab9qukqr9426d';
var hostMovie = 'api.rottentomatoes.com';
var queryPageLimit = 5;

//VARIABILI PER RICHIESTA IMDB
var hostIMDB = 'www.imdb.com';
var pathIMDB = '/title/tt_ID/literature';

function httpGetMovie(response, query)
{
    var fullRequestQueryMovie = partialQueryMovie + apiKeyMovie;
    fullRequestQueryMovie += '&' + querystring.stringify({ q: query.q, page_limit: queryPageLimit, page: query.page });

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

    http.get(optionsMovie,
        function (res) {
            var jsonStringResponseMovie = '';
            console.log("statusCode: ", res.statusCode);

            res.on('data', function (piece) {
                jsonStringResponseMovie += piece;
            });

            res.on('end', function () {
                console.log("Got response from Rottentomatoes");
                
                var content = JSON.parse(jsonStringResponseMovie);
                if(content.error) {
                    console.log(content.error);
                    response.sendStatus(400);
                    return;
                }
                var numPages = Math.ceil(content.total/queryPageLimit);
                var films = [];
                for (var i = 0; i < content.movies.length; i++) {
                    films[i] = new Film(content.movies[i]);
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
                                query: query.q,
                                page: query.page,
                                pages: numPages
                            });
                        } else {
                            console.error(err);
                        }
                    });


            });

        }).on('error', function(err) {
            console.error(err);
        });
}

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
            var regex = new RegExp(".+?(?="+title[0]+")");
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

module.exports = {
    httpGetMovie: httpGetMovie
}