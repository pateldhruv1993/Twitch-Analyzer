var MongoClient = require('mongodb').MongoClient;

var _db;
var _chat_logs_coll;
var _clip_logs_coll;
var _viewer_logs_coll;
var _stream_logs_coll;

module.exports = {

  connectToServer: function (dbUrl, callback) {
    MongoClient.connect(dbUrl, function (err, db) {
      _db = db;
      _chat_logs_coll = db.collection("chat_logs");
      _stream_logs_coll = db.collection("stream_logs");
      _viewer_logs_coll = db.collection("viewer_logs");
      _clip_logs_coll = db.collection("clip_logs");
      return callback(err);
    });
  },

  insertData: function (data, collectionName) {
    var collection;
    if (collectionName == "chat_logs") {
      collection = _chat_logs_coll;
    } else if (collectionName == "stream_logs") {
      collection = _stream_logs_coll;
    } else if (collectionName == "viewer_logs") {
      collection = _viewer_logs_coll;
    } else if (collectionName == "clip_logs") {
      collection = _clip_logs_coll;
    }

    collection.insert(data, function (err, result) {
      if (err) {
        console.log("ERROR::" + err);
        return false;
      } else {
        //console.log("Inserted the record\n" + result);
        return true;
      }
    });
  },

  getDb: function () {
    return _db;
  },
};