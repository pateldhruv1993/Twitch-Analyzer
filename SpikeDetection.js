var DBManager = require("./DatabaseManager");
var slayer = require('slayer');

var db;

// Connection URL. This is where your mongodb server is running.
var dburl = "mongodb://localhost:27017/local";
var stream = "moonmoon_ow";


DBManager.connectToServer(dburl, function (err) {
    if (!err) {
        db = DBManager.getDb();
        cron();
    }
});

function cron() {
    var viewersData = { viewerCount: [], timestamp: [], chatCounts: [], viewerAndChatCounts: [] };
    getStartOfStream(stream, function getStartOfStreamCallback(startOfLastStream) {
        startOfLastStream = Number(startOfLastStream);
        var cursor = db.collection("viewer_logs").find({ 'stream': stream, "unixTimeSec": { $gt: startOfLastStream } }).sort({ unixTimeSec: 1 });
        cursor.each(function (err, item) {

            if (item == null) { // each loop finished
                scaleData(viewersData.viewerCount, function scaleDataCallback() {
                    //console.log(viewersData.viewerCount);
                    var counter = 0;
                    var cursor = db.collection("chat_logs").find({ "stream": stream, "unixTimeSec": { $gt: startOfLastStream } }).sort({ unixTimeSec: 1 });
                    cursor.count(function (err, num) {
                        console.log("Total number of chat counts returned:" + num);
                    });
                    cursor.each(function (err, item) {
                        if (item == null) {
                            //console.log(viewersData.chatCounts);
                            console.log("chat[0]:" + viewersData.chatCounts[0]);
                            scaleData(viewersData.chatCounts, function () {
                                //console.log(viewersData.chatCounts);

                                if (viewersData.viewerCount != null && viewersData.chatCounts.length == viewersData.viewerCount.length) {
                                    for (var i = 0; i < viewersData.viewerCount.length; i++) {
                                        viewersData.viewerAndChatCounts.push(viewersData.chatCounts[i] + viewersData.viewerCount[i]);
                                    }
                                }
                                console.log(viewersData.viewerAndChatCounts.length);
                                console.log(viewersData.viewerAndChatCounts);
                                slayer().fromArray(viewersData.viewerAndChatCounts).then(spikes => {
                                    console.log(spikes);      // [ { x: 4, y: 12 }, { x: 12, y: 25 } ]
                                });


                            });
                            return;
                        }

                        if (viewersData.chatCounts[counter] == undefined) {
                            viewersData.chatCounts[counter] = 0;
                        }
                        if (item.unixTimeSec <= viewersData.timestamp[counter]) {
                            if (viewersData.chatCounts[counter] != undefined) {
                                viewersData.chatCounts[counter] = viewersData.chatCounts[counter] + 1;
                            }
                        } else {
                            counter++;
                        }

                    });
                });
                return;
            }

            viewersData.viewerCount.push(item.viewerCount);
            viewersData.timestamp.push(item.unixTimeSec);

        });
    });
}


function scaleData(arr, callback) {

    var maxRange = Math.max.apply(Math, arr);
    var minRange = Math.min.apply(Math, arr);

    for (var i = 0; i < arr.length; i++) {
        arr[i] = scaleBetween(arr[i], 0, 1, minRange, maxRange);
    }

    callback();
}


function scaleBetween(unscaledNum, minAllowed, maxAllowed, min, max) {
    return (maxAllowed - minAllowed) * (unscaledNum - min) / (max - min) + minAllowed;
}


function getStartOfStream(stream, callback) {

    db.collection("stream_logs").find({ 'stream': stream, 'status': 'start' }).sort({ unixTimeSec: -1 }).each(function (err, item) {
        var valueToReturn = 0
        if (item == null) {
            valueToReturn = 0;
        } else {
            valueToReturn = item.unixTimeSec
        }
        callback(valueToReturn);
        return false;
    });
}