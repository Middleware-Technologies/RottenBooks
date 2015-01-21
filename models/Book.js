/**
 * Created by Francesco Nero on 1/19/15.
 */

function Book(data) {
    this.title = data.title;
    this.link = data.infoLink;
    this.thumbnail = data.thumbnail;
}

module.exports = Book;