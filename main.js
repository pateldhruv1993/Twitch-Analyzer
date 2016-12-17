var tmi = require("tmi.js");
var DBManager = require("./DatabaseManager.js");
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

var request = require("request");


// FOR VIEWER COUNT
var viewerCounts = [];
var dburl = "mongodb://localhost:27017/local";
var dbManager = new DBManager(dburl);


var temp2 = dbManager.Connect();
console.log("Did we connect to the databse???" + temp2);
var temp = dbManager.AddCollection(streamerName+"_chat_counts");
if(temp){
  console.log(streamerName+"_chat_counts added to the collections");
} else{
  console.log("COULD NOT ADD COLLECTION. Reason:" + temp);
}
//dbManager.AddCollection(streamerName + "_user_logs");
//dbManager.AddCollection(streamerName + "_viewer_counts");

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
  dbManager.InsertRows(streamerName+"_chat_counts", ircLog);
});



//Pretty much never works. TwitchAPI said its disable for big channels and also that they're grouped and sent every 30 secs or
// so we'll need a lot of logic to handle that too.
ircClient.on("join", function(channel, username, self) {
  /*if (userJoinBackLog.length > 0) {
    chatCountsCollections.insert(userJoinBackLog, function(err, result) {
      if (err) {
        console.log(err);
      } else {
        //console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', result.length, result);
      }
    });
  }*/
});


ircClient.on("error", function(message) {
  console.log("ERROR:=====>" + message);
});

/*
//push all the viewcount stuff into an array and then push it into the db after sometime
setTimeout(function() {
  console.log("CAME HERE1");
  var apiUrl = "https://api.twitch.tv/kraken/streams?channel=" + streamerName + "&client_id=dcjnqfita9g9qzn55h1y2wnoanbzi8f";
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
      } catch (err) {}
    } else {
      console.log("Something went wrong while trying to get the viewer count for " + streamerName);
    }
  });
}, 3000);
*/
