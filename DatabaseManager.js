
var mongodb = require("mongodb"); //lets require/import the mongodb native drivers.

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var dburl = "mongodb://localhost:27017/local";
var collections = {};

function DBManager(dbUrl) {
  // always initialize all instance properties
  this.bar = bar;
  this.baz = 'baz'; // default value
}
// class methods
Foo.prototype.fooBar = function() {

};
// export the class
module.exports = DBManager;
