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
    var viewersData = { viewerCount: [], timestamp: [] };
    getStartOfStream(stream, function getStartOfStreamCallback(startOfLastStream) {
        startOfLastStream = Number(startOfLastStream);
        var cursor = db.collection("viewer_logs").find({ 'stream': stream, "unixTimeSec": { $gt: startOfLastStream } }).sort({ unixTimeSec: 1 });
        cursor.each(function (err, item) {

            if (item == null) { // each loop finished
                scaleData(viewersData.viewerCount, function scaleDataCallback() {
                    console.log(viewersData.viewerCount);
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