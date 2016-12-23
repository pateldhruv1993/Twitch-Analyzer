var express = require('express');
var gauss = require('gauss');
var router = express.Router();
var DBManager = require("../DatabaseManager");

var db;
/* GET home page. */
router.get('/', function (req, res, next) {
    db = DBManager.getDb();
    var func = req.query.func;
    var stream = req.query.stream;
    var latestLogTime = req.query.latestLogTime;
    var startTime = req.query.start;
    var endTime = req.query.start;
    if (func == "viewerGraph") {
        getViewersGraphData(stream, 2000000000, latestLogTime, res);
    } else if (func == "chatGraph") {
        getChatGraphData(stream, 10000, latestLogTime, res);
    }
});


function getChatGraphData(stream, maxDocs, latestLogTime, res) {
    var data = { chatCounts: [], time: [], movingAvgPoints: [], movingAvgTime: [] }
    var movingAvgPriod = 5;
    chatCondenseBlockSize = 5; //in seconds
    getStartOfStream(stream, function getStartOfStreamCallback(startOfLastStream) {
        startOfLastStream = Number(startOfLastStream);
        var cursor = db.collection("chat_logs").find({ "stream": stream, "unixTimeSec": {$gt: startOfLastStream}});
        cursor.count(function callbackAfterCount (error, numOfDocs) {
            /*var numOfDocsToSkip = (numOfDocs + 1) - maxDocs;
            if (numOfDocs < maxDocs) {
                numOfDocsToSkip = 0;
            }
            var counter = 0;
            */
            var startTime = 0;
            var chatCounter = 0;
            cursor.each(function cursorLoopCallback(err, item) {
                if (item == null) {
                    res.json(data);
                    return;
                }

                var record = {};

                if (startTime == 0) {
                    startTime = item.unixTimeSec + chatCondenseBlockSize;
                }

                data.latestLogTime = startTime;
                if (item.unixTimeSec < startTime) {
                    chatCounter++;
                } else {
                    data.chatCounts.push(chatCounter);
                    data.time.push(unixTimeSecToTime(startTime));
                    chatCounter = 0;
                    var tempCounter = 0
                    while (true) {
                        if(tempCounter > 100000){
                            console.log("Awww shit");
                        }
                        startTime = startTime + chatCondenseBlockSize;
                        if (item.unixTimeSec < startTime) {
                            chatCounter = 1;
                            break;
                        } else {
                            data.chatCounts.push(0);
                            data.time.push(unixTimeSecToTime(startTime));
                        }
                        tempCounter++;
                    }
                }
                /*counter++;
                var date;
                if (counter < numOfDocsToSkip) {
                    return;
                }
                */


                //data.time.push(unixTimeSecToTime(item.unixTimeSec));
                //data.viewerCount.push(item.viewerCount);
            });
        });
    });
}



function getViewersGraphData(stream, maxDocs, latestLogTime, res) {
    var data = { viewerCount: [], time: [], movingAvgPoints: [], movingAvgTime: [], movingAvgPoints10: [], movingAvgTime10: [], movingAvgPoints20: [], movingAvgTime20: [] };
    var movingAvgPeriod = 5;

    var cursor = db.collection("viewer_logs").find({ 'stream': stream, "unixTimeSec": {$gt: 1482418583} }).sort({ unixTimeSec: 1 });
    cursor.count(function (error, numOfDocs) {

        var numOfDocsToSkip = (numOfDocs + 1) - maxDocs;
        if (numOfDocs < maxDocs) {
            numOfDocsToSkip = 0;
        }
        var counter = 0;

        cursor.each(function (err, item) {
            counter++;
            var record = {};
            if (counter < numOfDocsToSkip) {
                return;
            }

            if (item == null) {
                // All the objects have been added and the last item in cursor is empty
                // Putting this code after the .each() would cause that code to run first before this loop finishes
                // coz of promies. So put code here or check out .then()
                //var movingAvgPoints = data.viewerCount.toVector();
                var temp1 = data.time.slice();
                var temp2 = data.time.slice();
                var temp3 = data.time.slice();
                console.log("NUMBER OF RECORDS SENT TO THE CLIENT:" + data.time.length);
                data.movingAvgPoints = data.viewerCount.toVector().sma(movingAvgPeriod);
                data.movingAvgTime = temp1.splice(0);
                data.movingAvgTime.splice(0, (movingAvgPeriod - 1));

                data.movingAvgPoints10 = data.viewerCount.toVector().sma(10);
                data.movingAvgTime10 = temp2.splice(0);
                data.movingAvgTime10.splice(0, (10 - 1));

                data.movingAvgPoints20 = data.viewerCount.toVector().sma(100);
                data.movingAvgTime20 = temp3.splice(0);
                data.movingAvgTime20.splice(0, (100 - 1));
                console.log("NUMBER OF RECORDS SENT TO THE CLIENT:" + data.time.length);
                res.json(data);
                return;
            }
            data.time.push(unixTimeSecToTime(item.unixTimeSec));
            data.viewerCount.push(item.viewerCount);
            data.latestLogTime = item.unixTimeSec;
        });
    });
}


function unixTimeSecToTime(unixTimeSec) {
    var date = new Date(unixTimeSec * 1000);
    // Hours part from the timestamp
    var hours = date.getHours();
    if (hours < 10) { hours = "0" + hours }
    // Minutes part from the timestamp
    var minutes = date.getMinutes();
    if (minutes < 10) { minutes = "0" + minutes }
    // Seconds part from the timestamp
    var seconds = date.getSeconds();
    if (seconds < 10) { seconds = "0" + seconds }

    return (hours + ":" + minutes + ":" + seconds);
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

module.exports = router;