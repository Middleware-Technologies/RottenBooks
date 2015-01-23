/**
 * Created by Francesco Nero on 1/19/15.
 */

function Film(data) {
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

    this.id=data.id;
    this.directors=[];
}


module.exports = Film;