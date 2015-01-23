/**
 * Created by Francesco Nero on 1/19/15.
 */

var Film = require('../models/Film');
var Book = require('../models/Book');

var gBooks = require('google-books-search');
var cheerio = require('cheerio');
var async = require('async');
var http = require('http');



var querystring = require('querystring');
RegExp.quote = require('regexp-quote');

//VARIABILI PER PRODURRE PATH DI RICHIESTA
var partialQueryMovie = '/api/public/v1.0/movies.json?apikey=';
var apiKeyMovie = 'xxcrmh8fb44ab9qukqr9426d';
var hostMovie = 'api.rottentomatoes.com';
var queryPageLimit = 4;

//VARIABILI PER RICHIESTA SU FILM SPECIFICO
var partialQuerySingleMovie = '/api/public/v1.0/movies/';

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
        function (res)
        {
            var jsonStringResponseMovie = '';
            //console.log("statusCode: ", res.statusCode);

            res.on('data', function (piece) {
                jsonStringResponseMovie += piece;
            });

            res.on('end', function ()
            {
                console.log("Got response from Rottentomatoes");
                
                var content = JSON.parse(jsonStringResponseMovie);
                if(content.error) {
                    console.log(content.error);
                    response.sendStatus(400);
                    return;
                }
                var numPages = Math.min(Math.ceil(content.total/queryPageLimit), 25); //rottentomatoes limit
                var films = [];
                for (var i = 0; i < content.movies.length; i++)
                {
                    films[i] = new Film(content.movies[i]);
                }

                async.each(films,
                    function(film, callback)
                    {
                        //SEARCH FOR DIRECTOR
                        var requestUrl = partialQuerySingleMovie +film.id+'.json';
                        requestUrl +='?apikey='+apiKeyMovie;

                        var optionsSingleMovie =
                        {
                            host: hostMovie,
                            path: requestUrl,
                            method: 'GET',
                            headers: headersMovie
                        };

                        var singleFilm = http.request(optionsSingleMovie,
                            function (resSingleFilm)
                            {
                                var jsonSingleMovie = '';

                                resSingleFilm.on('data', function (part)
                                {
                                    jsonSingleMovie += part;
                                });

                                resSingleFilm.on('end', function ()
                                {
                                    var singleFilmContent = JSON.parse(jsonSingleMovie);
                                    var directors=singleFilmContent.abridged_directors;
                                    if(singleFilmContent.abridged_directors)
                                        film.directors=directors;
                                    else
                                        film.directors=[];

                                });

                            }).on('error', function(err)
                            {
                                console.error(err);
                            });
                        singleFilm.end();


                        //GO LOOK FOR THE BOOK
                        if (film.imdb)
                        {
                            var optionsIMDB =
                            {
                                host: hostIMDB,
                                path: pathIMDB.replace('_ID', film.imdb),
                                method: 'GET'
                            };

                            console.log("SCRAPE: "+ optionsIMDB.host + optionsIMDB.path);

                            var reqIMDB = http.request(optionsIMDB,
                                function (resIMDB)
                                {
                                    var IMDBStringResponse = '';

                                    resIMDB.on('data', function (piece)
                                    {
                                        IMDBStringResponse += piece;
                                    });

                                    resIMDB.on('end', function ()
                                    {
                                        var contentIMDB = cheerio.load(IMDBStringResponse);
                                        var originalBooks = contentIMDB('*').filter(function () {
                                            return contentIMDB(this).text() === 'Original Literary Source';
                                        })[0];
                                        var originalBooks = extractBooksInfo(originalBooks);
                                        async.each(originalBooks,
                                            function(originalBook, callback)
                                            {
                                                //console.log("Searching for book: " + originalBook.title + " by " + originalBook.author);
                                                gBooks.search('', {
                                                    fields: {
                                                        title: originalBook.title,
                                                        author: originalBook.author
                                                    },
                                                    limit:1
                                                }, function (error, results) {
                                                    if (!error) {
                                                        for (var j = 0; j < Math.min(results.length, 1); j++) {
                                                            film.books.push(new Book(results[0]));
                                                        }
                                                    } else {
                                                        console.log(error);
                                                    }
                                                    callback();
                                                });
                                            },
                                            function(err)
                                            {
                                                console.log("Found " + originalBooks.length + " books for " + film.title);
                                                callback();
                                            });
                                    });
                                });

                            reqIMDB.on('error', function (e)
                            {
                                console.error("REQUEST TO IMDB FAILED");
                                console.error(e);
                                callback();
                            });
                            reqIMDB.end();
                        }
                        else
                        {
                            callback();
                        }
                    },
                    function(err)
                    {
                        console.log("All requests done!");
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

function extractBooksInfo(htmlNode) {

    var out = [];

    if(!htmlNode){
        return out;
    }

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
            var regex = new RegExp(".+?(?="+RegExp.quote(title[0])+")");
            title = title[1];
            out.push({
                title: cleanString(title),
                author: cleanString(str.match(regex)[0])
            });
        }
        next = next.next; //lol
    }

    return out;
}


module.exports = {
    httpGetMovie: httpGetMovie
}