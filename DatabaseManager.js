
var mongodb = require("mongodb"); //lets require/import the mongodb native drivers.

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var dburl = "";
var db;
var collections = {};
var isConnected = false;
var dbMessages = ["DB_NOT_CONNECTED", "COLLECTION_NOT_FOUND", "COULD_NOT_INSERT"];


function DBManager(dbUrl) {
  dburl = dbUrl;
}


// class methods
DBManager.prototype.Connect = function(){
  console.log(dburl);
  MongoClient.connect(dburl, function(err, db) {
    if(err){
      console.log("\n\nError while connecting to database:");
      console.log(err);
      isConnected = false;
      return dbMessages[0];
    } else{
      this.db = db;
      isConnected = true;
      return true;
    }
  });
};


DBManager.prototype.AddCollection = function(collectionName){
  if(isConnected){
    db.collection(collectionName, {strict:true}, function(err, collection){
      if(err){
        console.log("\n\nError while adding collection:");
        console.log(err);
        return dbMessages[1];
      } else{
        collections[collectionName] = collection;
        return true;
      }
    });
  } else{
    return dbMessages[0];
  }
};

DBManager.prototype.InsertRows = function(collectionName, data){
  if(isConnected){
    collections[collectionName].insert(data, function(err, result) {
      if (err) {
        console.log("\n\nError while inserting rows:");
        console.log(err);
        return dbMessages[2];
      } else {
        return true;
      }
    });
  } else{
    return dbMessages[0];
  }
};

// export the class
module.exports = DBManager;
