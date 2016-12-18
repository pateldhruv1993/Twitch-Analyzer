var tmi = require("tmi.js");
var DBManager = require("./DatabaseManager");
var express = require('express');
var request = require("request");
var app = express();
var mongodb = require("mongodb"); //lets require/import the mongodb native drivers.
//We need to work with "MongoClient" interface in order to connect to a mongodb server.


var MongoClient = mongodb.MongoClient;
// Connection URL. This is where your mongodb server is running.
var dburl = "mongodb://localhost:27017/local";


var streamerList = ["theonemanny", "lirik", "moonmoon_ow"]; //""theonemanny;
var onlineStreamers = [];
getOnlineStreamers();
var channelsToConnectTo = [];


if(onlineStreamers.length > 0){
  onlineStreamers.array.forEach(function(streamerName) {
    channelsToConnectTo.push("#" + streamerName);
  }, this);
} else{
  console.log("No streamers online from the list!!");
}


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

var ircClient = new tmi.client(ircOptions);
var db;



DBManager.connectToServer(dburl, function (err) {
  if (!err) {
    db = DBManager.getDb();


    // Connect the client to the server..
    ircClient.connect();
    ircClient.on("error", function (message) {
      console.log("ERROR:=====>" + message);
    });


    ircClient.on("chat", function (channel, userstate, message, self) {
      if (self) { // Don't listen to my own messages..
        return;
      }

      // Do your stuff.
      var unixTimeSec = Math.floor(new Date() / 1000);
      var ircLog = {
        unixTimeSec: unixTimeSec,
        stream: channel,
        username: userstate["display-name"]
      };

      DBManager.insertData(ircLog, "chat_logs");
    });

    logViewers();


    // respond with "hello world" when a GET request is made to the homepage
    app.get('/', function (req, res) {
      res.send('hello world');
    });

    app.listen(3033, function () {
      console.log('Twitch-app-analyzer app listening on port 3003!')
    })
  }
});


function logViewers() {
  console.log("CAME HERE1");
  var apiUrl = "https://api.twitch.tv/kraken/streams?channel=" + streamerName + "&client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f";

  request({
    url: apiUrl,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      try {
        var viewerCount = body.streams[0].viewers;
        var unixTimeSec = Math.floor(new Date() / 1000);
        var viewerCounts = {
          unixTimeSec: unixTimeSec,
          viewerCount: viewerCount
        };
        console.log("ViewerCounts.lenght" + viewerCounts.length);
        DBManager.insertData(viewerCounts, "viewer_logs");
        console.log(viewerCount);
      } catch (err) {

      }
    } else {
      console.log("Something went wrong while trying to get the viewer count for: " + streamerName);
    }
  });
  setTimeout(logViewers, 5000);
}


function getOnlineStreamers() {

  streamerList.forEach(function (streamerName) {
    var apiUrl = "https://api.twitch.tv/kraken/streams?channel=" + streamerName + "&client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f";
    request({
      url: apiUrl,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        try {
          if(body.streams.length > 0){
            onlineStreamers.push(streamerName);
          }
        } catch (err) {

        }
      } else {
        console.log("Something went wrong while trying to get the list of online streamers");
      }
    });
  }, this);
}