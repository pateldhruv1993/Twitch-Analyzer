var tmi = require("tmi.js");
var DBManager = require("./DatabaseManager");
var express = require('express');
var request = require("request");
var app = express();
var mongodb = require("mongodb"); //lets require/import the mongodb native drivers.


var MongoClient = mongodb.MongoClient;
// Connection URL. This is where your mongodb server is running.
var dburl = "mongodb://localhost:27017/local";


var streamerList = ["esl_overwatch", "theonemanny", "lirik", "moonmoon_ow"]; //""theonemanny;
var onlineStreamers = [];
var channelsToConnectTo = [];



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
  channels: []
};


var ircClient = new tmi.client(ircOptions);
var db;


DBManager.connectToServer(dburl, function (err) {
  if (!err) {
    db = DBManager.getDb();


    // Connect the client to the server..
    ircClient.connect();
    cron();


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
        stream: channel.substring(1),
        username: userstate["display-name"]
      };

      DBManager.insertData(ircLog, "chat_logs");
    });


    // respond with "hello world" when a GET request is made to the homepage
    app.get('/', function (req, res) {
      res.send('hello world');
    });

    app.listen(3033, function () {
      console.log('Twitch-app-analyzer app listening on port 3003!')
    })
  }
});


function checkUpOnStreams() {
  var temp;
  onlineStreamers.forEach(function (streamerName) {
    temp.push("#" + streamerName);
  }, this);
  if (connectedStreams.sort().join(',') === temp.sort().join(',')) {

  } else {

  }
}



function cron() {
  streamerList.forEach(function (streamerName) {
    var apiUrl = "https://api.twitch.tv/kraken/streams?channel=" + streamerName + "&client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f";

    request({
      url: apiUrl,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        try {
          if (body.streams.length > 0) {
            onlineStreamers.push(streamerName);

            var connectedToThese = ircClient.getChannels();
            console.log("All the channels I'm connected to:" + connectedToThese);
            var index = connectedToThese.indexOf("#"+streamerName);
            if (index == -1) {
              ircClient.join("#" + streamerName).then(function (data) {
                console.log("Successful in joining the channel: #" + streamerName);
              }).catch(function (err) {
                console.log("ERROR:: Problem while joining the channel: #" + streamerName);
              });
            }
            var viewerCount = body.streams[0].viewers;
            var unixTimeSec = Math.floor(new Date() / 1000);
            var viewerCounts = {
              unixTimeSec: unixTimeSec,
              stream: streamerName,
              viewerCount: viewerCount
            };
            console.log("ViewerCounts.lenght" + viewerCounts.length);
            DBManager.insertData(viewerCounts, "viewer_logs");
            console.log(viewerCount);
          } else {
            var index = onlineStreamers.indexOf(streamerName);
            if (index > -1) {

              client.part("#" + onlineStreamers[index]).then(function (data) {
                console.log("Parteded from #" + streamerName);
              }).catch(function (err) {
                console.log("ERROR:: Problem while parting from a channel: #" + streamerName);
              });

              onlineStreamers.splice(index, 1);
            }
          }
        } catch (err) {

        }
      } else {
        console.log("Something went wrong while trying to get the viewer count for: " + streamerName);
      }
    });
  }, this);

  setTimeout(cron, 5000);
}


function getOnlineStreamers() {
  onlineStreamers = [];
  streamerList.forEach(function (streamerName) {
    var apiUrl = "https://api.twitch.tv/kraken/streams?channel=" + streamerName + "&client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f";
    request({
      url: apiUrl,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        try {
          if (body.streams.length > 0) {
            onlineStreamers.push(streamerName);
            ircClient.join("#" + streamerName).then(function (data) {
              console.log("Successful in joining the channel: #" + streamerName);
            }).catch(function (err) {
              console.log("ERROR:: Problem while joining the channel: #" + streamerName);
            });
          }
        } catch (err) {

        }
      } else {
        console.log("Something went wrong while trying to get the list of online streamers");
      }
    });
  }, this);
}