var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var tmi = require("tmi.js");
var request = require("request");
var mongodb = require("mongodb");



var DBManager = require("./DatabaseManager");


var db;
var streamerList = ["esl_overwatch", "theonemanny", "lirik", "moonmoon_ow", "mendokusaii", "curse"]; //""theonemanny;
var onlineStreamers = [];
var ircOptions = {
  options: {
    debug: false
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


var MongoClient = mongodb.MongoClient;
// Connection URL. This is where your mongodb server is running.
var dburl = "mongodb://localhost:27017/local";
var ircClient = new tmi.client(ircOptions);


var routes = require('./routes/index');
var users = require('./routes/users');
var api = require('./routes/api');

var app = express();


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







    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    // uncomment after placing your favicon in /public
    //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
      extended: false
    }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));



    app.use('/', routes);
    app.use('/users', users);
    app.use('/api', api);

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
      app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
          message: err.message,
          error: err
        });
      });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {}
      });
    });


    /*// respond with "hello world" when a GET request is made to the homepage
    app.get('/', function (req, res) {
      res.send('hello world');
    });
    */
  }
});


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
            var connectedToThese = ircClient.getChannels();
            var temp = onlineStreamers.indexOf(streamerName);
            if (temp == -1) {
              onlineStreamers.push(streamerName);
              checkIfStreamInLogs(streamerName, Math.floor((new Date(body.streams[0]['created_at']) / 1000)), "start");
            }


            var index = connectedToThese.indexOf("#" + streamerName);
            if (index == -1) {
              ircClient.join("#" + streamerName).then(function (data) {
                console.log("Successful in joining the channel: #" + streamerName);
                console.log("All the channels I'm connected to:" + connectedToThese);
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
            DBManager.insertData(viewerCounts, "viewer_logs");
          } else {
            var index = onlineStreamers.indexOf(streamerName);
            if (index > -1) {

              ircClient.part("#" + onlineStreamers[index]).then(function (data) {
                console.log("Parteded from #" + streamerName);
              }).catch(function (err) {
                console.log("ERROR:: Problem while parting from a channel: #" + streamerName);
              });



              //TODO:: Add code to log stream stop status to the steram logs. Currently only stream starts are being logged
              checkIfStreamInLogs(streamerName, Math.floor(new Date() / 1000), "stop");




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



//NOTICE: Multiple "stop" status from a same channel without a "start" between them means stream dropped
// keeping it this way so that we can choose to ignore the chat spam during that drop. Also twitch seems to
// have the entire stream in one single VOD even though there were drops.
function checkIfStreamInLogs(streamName, unixTimeSec, status) {
  streamName = streamName.toLowerCase();
  db.collection("stream_logs").find({
    'stream': streamName,
    'unixTimeSec': unixTimeSec,
    'status': status
  }).count(function (error, numOfDocs) {
    if (numOfDocs == 0) {
      console.log(streamName + "'s STREAM WAS CREATED ON:" + unixTimeSec);

      var streamLog = {
        unixTimeSec: unixTimeSec,
        stream: streamName,
        status: status
      };


      // NOTE: Make sure this part of code adds VOD id to stream_logs everytime. Even if the stream just started
      // IF IT DOESNT WORK: It might be becuase we made the api call to VODs list almost instantly after the streamer started streaming and so its not on the VOD list yet???
      if (status == "start") {
        var apiUrl = "https://api.twitch.tv/kraken/channels/" + streamName + "/videos?client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f&broadcasts=true";
        request({
          url: apiUrl,
          json: true
        }, function (error, response, body) {
          body.videos.forEach(function(vod){
            if(vod.status == "recording"){
              if(vod._id[0] == "v"){
                streamLog.vod_id = vod._id.substring(1);
              } else{
                streamLog.vod_id = vod._id;
              }
              DBManager.insertData(streamLog, "stream_logs");      
            }
          }, this);
        });
      } else {
        DBManager.insertData(streamLog, "stream_logs");
      }

      
    }
  });
}


module.exports = app;