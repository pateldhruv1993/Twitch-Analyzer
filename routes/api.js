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
        getViewersGraphData(stream, 200, latestLogTime, res);
    } else if (func == "chatGraph") {
        getChatGraphData(stream, 200, latestLogTime, res);
    }
});


function getChatGraphData(stream, maxDocs, latestLogTime, res) {
    var data = {
        chatCounts: [],
        time: [],
        movingAvgPoints: [],
        movingAvgTime: []
    };
    chatCondenseBlockSize = 5; //in seconds
    getStartOfStreamAndVodId(stream, function getStartOfStreamCallback(startOfLastStream) {
        startOfLastStream = Number(startOfLastStream);
        var cursor = db.collection("chat_logs").find({"stream": stream,"unixTimeSec": {$gt: startOfLastStream}}).sort({unixTimeSec: -1});
        //var cursor = db.collection("chat_logs").find({ "stream": stream, "unixTimeSec": { $gt: startOfLastStream } });
        cursor.count(function callbackAfterCount(error, numOfDocs) {
            var chatCounter = 0;
            var condenseGate = 0;
            var dataReturned = false;
            cursor.each(function cursorLoopCallback(err, item) {
                if(dataReturned){
                    //Pointless returns to exhaust cursor coz I couldn't find any freaking way to break this loop!
                    return false;
                }
                if (item == null || data.time.length >= maxDocs) {
                    //data.chatCounts.reverse();
                    //data.time.reverse();
                    data.time = reverseArray(data.time);
                    data.chatCounts = reverseArray(data.chatCounts);
                    res.json(data);
                    dataReturned = true;
                    return false;
                }

                if (condenseGate == 0) {
                    data.latestLogTime = item.unixTimeSec;
                    condenseGate = item.unixTimeSec - chatCondenseBlockSize;
                }

                if (item.unixTimeSec > condenseGate) {
                    chatCounter++;
                } else {
                    data.chatCounts.push(chatCounter);
                    data.time.push(unixTimeSecToTime(condenseGate));
                    chatCounter = 0;
                    var tempCounter = 0;
                    while (true) {
                        if (tempCounter > 100000) {
                            console.log("Probably hit an infinite loop so breaking it.");
                            break;
                        }

                        condenseGate = condenseGate - chatCondenseBlockSize;
                        if (item.unixTimeSec > condenseGate) {
                            chatCounter++;
                            break;
                        } else {
                            data.chatCounts.push(0);
                            data.time.push(unixTimeSecToTime(condenseGate));
                        }

                        tempCounter++;
                    }
                }
            });
        });
    });
}



function getViewersGraphData(stream, maxDocs, latestLogTime, res) {
    var data = {
        viewerCount: [],
        time: [],
        movingAvgPoints: [],
        movingAvgTime: [],
        movingAvgPoints10: [],
        movingAvgTime10: [],
        movingAvgPoints20: [],
        movingAvgTime20: []
    };
    var movingAvgPeriod = 5;

    getStartOfStreamAndVodId(stream, function getStartOfStreamCallback(startOfLastStream, vodId) {
        startOfLastStream = Number(startOfLastStream);
        var cursor = db.collection("viewer_logs").find({
            'stream': stream,
            "unixTimeSec": {
                $gt: startOfLastStream
            }
        }).sort({
            unixTimeSec: 1
        });
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
                    var start, end;
                    console.log("NUMBER OF RECORDS SENT TO THE CLIENT:" + data.time.length);
                    data.movingAvgPoints = data.viewerCount.toVector().sma(movingAvgPeriod);
                    start = Math.round(movingAvgPeriod / 2);
                    data.movingAvgTime = temp1.splice(start, data.movingAvgPoints.length);

                    //data.movingAvgTime.splice(0, (movingAvgPeriod - 1));

                    data.movingAvgPoints10 = data.viewerCount.toVector().sma(10);
                    start = Math.round(10 / 2);
                    data.movingAvgTime10 = temp2.splice(start, data.movingAvgPoints10.length);
                    //data.movingAvgTime10.splice(0, (10 - 1));

                    data.movingAvgPoints20 = data.viewerCount.toVector().sma(100);
                    start = Math.round(100 / 2);
                    data.movingAvgTime20 = temp3.splice(start, data.movingAvgPoints20.length);
                    //data.movingAvgTime20.splice(0, (100 - 1));
                    console.log("NUMBER OF RECORDS SENT TO THE CLIENT:" + data.time.length);
                    res.json(data);
                    return;
                }
                data.time.push(unixTimeSecToTime(item.unixTimeSec));
                data.viewerCount.push(item.viewerCount);
                data.latestLogTime = item.unixTimeSec;
            });
        });
    });
}


function unixTimeSecToTime(unixTimeSec) {
    var date = new Date(unixTimeSec * 1000);
    // Hours part from the timestamp
    var hours = date.getHours();
    if (hours < 10) {
        hours = "0" + hours
    }
    // Minutes part from the timestamp
    var minutes = date.getMinutes();
    if (minutes < 10) {
        minutes = "0" + minutes
    }
    // Seconds part from the timestamp
    var seconds = date.getSeconds();
    if (seconds < 10) {
        seconds = "0" + seconds
    }

    return (hours + ":" + minutes + ":" + seconds);
}


function reverseArray(array) {
    var left = null;
    var right = null;
    var length = array.length;
    for (left = 0; left < length / 2; left += 1) {
        right = length - 1 - left;
        var temporary = array[left];
        array[left] = array[right];
        array[right] = temporary;
    }
    return array;
}


function getStartOfStreamAndVodId(stream, callback) {

    db.collection("stream_logs").find({
        'stream': stream,
        'status': 'start'
    }).sort({
        unixTimeSec: -1
    }).each(function (err, item) {
        var startTime = 0;
        var vodId = "";
        if (item != null) {
            startTime = item.unixTimeSec;
            vodId = item.vod_id;
        }
        callback(startTime, vodId);
        return false;
    });
}

module.exports = router;