var mongodb =   require("mongodb");
var DBManager = require("./DatabaseManager");
var db;

var MongoClient = mongodb.MongoClient;
var dburl = "mongodb://localhost:27017/local";
DBManager.connectToServer(dburl, function (err) {
  if (!err) {
    db = DBManager.getDb();

    var viewer_logs = db.collection("viewer_logs");
    var cursor = viewer_logs.find({stream:"lirik"});
    cursor.each(function(err, item) {
        // If the item is null then the cursor is exhausted/empty and closed
        console.log(item);
        if(item == null) {
            db.close(); // you may not want to close the DB if you have more code....
            return;
        }
        // otherwise, do something with the item
    });
  }
});