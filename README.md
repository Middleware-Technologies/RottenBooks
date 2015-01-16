RottenBooks
====================

Application that provides a movie searching service which aggregates data from Rottentomatoes and Google Books 


The "Movie-Book Worm" application offers a movie searching service to its users. The application is made by a single web page (the front-end) and a server-side application using SOA (the back-end). The "Movie-Book Worm" allows its users to insert the title of a movie. After pressing the "search" button, the inserted title is sent to the back-end, which answers with a set of results encoded in JSON.

Details: 
•The back-end must use the API offered by the well-known site rottentomatoes.com. To use this API you must create a developer account. After creating your account you may create an application that has an associated AccessKey to access the API.
•The back-end should not return the whole JSON given back by Rottentomatoes as is, but it has to simplify it, keeping just the movie title, the year of publication, the name of the director(s), the two marks calculated by Rottentomatoes (critics and audience), and the link to the movie's poster.
•The returned JSON must also include one or more links to the books from which the movie was based on. This information must be collected through the "Google Books" service.

Final notice: the "Movie-Book Worm" back-end must offer a SOA based interface that must fully mask the services it is based on (i.e., Rottentomatoes and Google Books). Communication between the browser and the application must pass through this interface and the original services must be kept completely hidden.
