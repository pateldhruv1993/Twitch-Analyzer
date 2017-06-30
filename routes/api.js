var express = require('express');
var gauss = require('gauss');
var async = require("async");
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
    var maxDocs = 200;

    var data = {
        viewerCounts: [],
        chatCounts: [],
        time: [],
        reversedViewerCounts: [],
        reversedChatCounts: [],
        reversedTime: [],
        movingAvgPoints: [],
        movingAvgTime: [],
        movingAvgPoints10: [],
        movingAvgTime10: [],
        movingAvgPoints20: [],
        movingAvgTime20: []
    };


    if (func == "viewerGraph") {

        async.waterfall([function (callback) {
                getStartOfStreamAndVodId(stream, function (startOfLastStream, vodId) {
                    callback(null, stream, maxDocs, latestLogTime, startOfLastStream, vodId);
                });
            }, getViewersGraphData],
            function finalCallback(err, reversedTime, reversedViewerCounts, newLatestLogTime) {
                if (err) {
                    res.write("Error while getting viewers graph data.");
                    console.log("ERROR: While sending viewer graph data. MSG:" + err);
                } else {
                    data.time = reverseArray(reversedTime);
                    data.viewerCounts = reverseArray(reversedViewerCounts);
                    data.latestLogTime = newLatestLogTime;
                    res.json(data);
                }
            }
        );
        //getViewersGraphData(stream, 200, latestLogTime, res);
    } else if (func == "chatGraph") {
        async.waterfall([function (callback) {
                getStartOfStreamAndVodId(stream, function (startOfLastStream, vodId) {
                    callback(null, startOfLastStream, vodId, stream, maxDocs, latestLogTime);
                });
            }, getChatGraphData],
            function finalCallback(err, reversedTime, reversedChatCounts, newLatestLogTime) {
                if (err) {
                    res.write("Error while getting chat graph data.");
                    console.log("ERROR: While sending chat graph data. MSG:" + err);
                } else {

                    data.time = reversedTime;
                    data.chatCounts = reversedChatCounts;
                    data.latestLogTime = newLatestLogTime;
                    res.json(data);
                }
            });
        //getChatGraphData(stream, 200, latestLogTime, res);
    } else if (func == "viewerChatGraph") {

    } else if (func == "viewerChatSpikeGraph") {

    }
});



function getChatGraphData(startOfLastStream, vodId, stream, maxDocs, latestLogTime, callback) {
    var reversedTime = [];
    var reversedChatCounts = [];
    var chatCondenseBlockSize = 5; //in seconds
    var chatCounter = 0;
    var condenseGate = 0;
    var dataReturned = false;
    var newLatestLogTime;
    var latestTimeLog = 0;
    var cursor = db.collection("chat_logs").find({
        "stream": stream,
        "unixTimeSec": {
            $gt: startOfLastStream
        }
    }).sort({
        unixTimeSec: -1
    });


    cursor.each(function cursorLoopCallback(err, item) {
        if (dataReturned) {
            return false;
        }

        if (item == null) {

            reversedTime = reversedTime.slice(Math.max(reversedTime.length - maxDocs, 1));
            reversedChatCounts = reversedChatCounts.slice(Math.max(reversedChatCounts.length - maxDocs, 1));

            var lastKnowTime = 0;
            for (var i = 0; i < reversedTime.length; i++) {
                if (!reversedTime[i]) {
                    reversedTime[i] = unixTimeSecToTime(lastKnowTime + chatCondenseBlockSize);
                    lastKnowTime = lastKnowTime + chatCondenseBlockSize;
                    reversedChatCounts[i] = 0;
                } else {
                    lastKnowTime = reversedTime[i];
                    reversedTime[i] = unixTimeSecToTime(reversedTime[i]);
                }
            }

            callback(null, reversedTime, reversedChatCounts, newLatestLogTime);
            dataReturned = true;
            return false;
        }


        var arrPosition = Math.floor((item.unixTimeSec - startOfLastStream) / chatCondenseBlockSize);

        if (reversedTime.length == 0) {
            latestTimePos = arrPosition;
        }

        if (arrPosition >= (latestTimePos - maxDocs)) {
            if (reversedTime[arrPosition] == undefined) {
                reversedTime[arrPosition] = startOfLastStream + (arrPosition * chatCondenseBlockSize);
            }

            if (reversedChatCounts[arrPosition] === undefined) {
                reversedChatCounts[arrPosition] = 1;
            } else {
                reversedChatCounts.splice(arrPosition, 1, (reversedChatCounts[arrPosition] + 1));
            }
        }

    });

}

function getViewersGraphData(stream, maxDocs, latestLogTime, startOfLastStream, vodId, callback) {
    var reversedTime = [];
    var reversedViewerCounts = [];
    var newLatestLogTime;
    var cursor = db.collection("viewer_logs").find({
        'stream': stream,
        "unixTimeSec": {
            $gt: startOfLastStream
        }
    }).sort({
        unixTimeSec: -1
    }).limit(Number(maxDocs));
    cursor.each(function (err, item) {
        if (err) {
            console.log("ERROR in getViewersGraphData" + err);
            callback(err);
            return;
        }
        if (item == null) {
            callback(null, reversedTime, reversedViewerCounts, newLatestLogTime);
            return;
        }

        newLatestLogTime = item.unixTimeSec;
        reversedTime.push(unixTimeSecToTime(item.unixTimeSec));
        reversedViewerCounts.push(item.viewerCount);
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
    }).limit(1).each(function (err, item) {
        var startTime = 0;
        var vodId = "";
        if (item != null) {
            startTime = item.unixTimeSec;
            vodId = item.vod_id;
            callback(startTime, vodId);
        }

        return false;
    });
}

module.exports = router;