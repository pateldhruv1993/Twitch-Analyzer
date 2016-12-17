var tmi = require("tmi.js");


var streamerName = "moonmoon_ow"; //""theonemanny;
var ircOptions = {
  options: {
    debug: true
  },
  connection: {
    reconnect: true
  },
  identity: {
    username: "MoralStatuteMachine",
    password: "oauth:r28aq9ng3pc4687cxkl0yf688xt1ta"
  },
  channels: ["#" + streamerName]
};
var userJoinBackLog = [];

var ircClient = new tmi.client(ircOptions);




var mongodb = require("mongodb"); //lets require/import the mongodb native drivers.

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var dburl = "mongodb://localhost:27017/";



var request = require("request");



// FOR VIEWER COUNT
var viewerCounts = [];





// Use connect method to connect to the Server
MongoClient.connect(dburl, function(err, db) {
  if (err) {
    console.log("Unable to connect to the mongoDB server. Error:" + err);
  } else {
    //HURRAY!! We are connected. :)
    console.log("Connection established to " + dburl);

    // Get the documents collection
    var chatCountsCollections = db.collection(streamerName + "_chat_counts");
    var userLogsCollections = db.collection(streamerName + "_user_logs");
    var viewerCountsCollections = db.collection(streamerName + "_viewer_counts");


    // Connect the client to the server..
    ircClient.connect();

    ircClient.on("chat", function(channel, userstate, message, self) {
      // Don't listen to my own messages..
      if (self) {
        return;
      }
      // Do your stuff.
      //console.log(userstate['display-name']);
      //console.log("USERSTATE==================>\n");
      //console.log(userstate);
      var unixTimeSec = Math.floor(new Date() / 1000);
      var ircLog = {
        unixTimeSec: unixTimeSec,
        username: userstate["display-name"]
      };
      chatCountsCollections.insert(ircLog, function(err, result) {
        if (err) {
          console.log("\n\nERROR:\n");
          console.log(err);
        } else {
          //console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', result.length, result);
        }
      });
    });

    ircClient.on("join", function(channel, username, self) {
      if (userJoinBackLog.length > 0) {
        chatCountsCollections.insert(userJoinBackLog, function(err, result) {
          if (err) {
            console.log(err);
          } else {
            //console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', result.length, result);
          }
        });
      }
    });

    ircClient.on("error", function(message) {
      console.log("ERROR:=====>" + message);
    });


    //push all the viewcount stuff into an array and then push it into the db after sometime
    setTimeout(function() {
      console.log("CAME HERE1");
      var apiUrl = "https://api.twitch.tv/kraken/streams?channel="+streamerName+"&client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f";

      request({
        url: apiUrl,
        json: true
      }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          try {
            console.log("CAME HERE");
            var viewerCount = body.streams[0].viewers;
            var unixTimeSec = Math.floor(new Date() / 1000);
            viewerCounts.push({
              unixTimeSec: unixTimeSec,
              viewerCount: viewerCount
            });
            console.log("ViewerCounts.lenght" + viewerCounts.length);
            if (viewerCounts.length > 0) {
              viewerCountsCollections.insert(viewerCounts, function(err, result) {
                console.log("CAME HERE 3");
                if (err) {
                  console.log(err);
                } else {
                  console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', viewerCounts.length, result);
                  viewerCounts = [];
                }
              });
            }
            console.log(viewerCount);
          } catch (err) {

          }
        } else {
          console.log("Something went wrong while trying to get the viewer count for " + streamerName);
        }
      }, 3000);
    });
  }
});
