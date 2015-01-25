/**
 * Created by Francesco Nero on 1/19/15.
 */

function Book(data) {
    this.title = data.title;
    this.authors = data.authors;
    this.link = "http://books.google.com/books?id="+data.id;
    this.thumbnail = data.thumbnail;
}

module.exports = Book;