var express = require('express');
var gauss = require('gauss');
var router = express.Router();
var DBManager = require("../DatabaseManager");

var db;
/* GET home page. */
router.get('/', function (req, res, next) {
    db = DBManager.getDb();
    var stream = req.query.stream;
    var startTime = req.query.start;
    var endTime = req.query.start;
    var data = { viewerCount: [], time: [], movingAvgPoints: [], movingAvgTime: [], movingAvgPoints10: [], movingAvgTime10: [], movingAvgPoints20: [], movingAvgTime20: [] };
    var movingAvgPeriod = 5;


    var cursor = db.collection("viewer_logs").find({ 'stream': stream }).sort({ unixTimeSec: 1 });
    cursor.count(function (error, numOfDocs) {

        var numOfDocsToSkip = (numOfDocs + 1) - 200;
        if(numOfDocs < 200){
            numOfDocsToSkip = 0;
        }
        var counter = 0;
        
        cursor.each(function (err, item) {
            counter++;
            var record = {};
            var date;
            if(counter < numOfDocsToSkip){
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
                console.log("NUMBER OF RECORDS SENT TO THE CLIENT:"+data.time.length);
                data.movingAvgPoints = data.viewerCount.toVector().sma(movingAvgPeriod);
                data.movingAvgTime = temp1.splice(0);
                data.movingAvgTime.splice(0, (movingAvgPeriod - 1));

                data.movingAvgPoints10 = data.viewerCount.toVector().sma(10);
                data.movingAvgTime10 = temp2.splice(0);
                data.movingAvgTime10.splice(0, (10 - 1));

                data.movingAvgPoints20 = data.viewerCount.toVector().sma(100);
                data.movingAvgTime20 = temp3.splice(0);
                data.movingAvgTime20.splice(0, (100 - 1));
                console.log("NUMBER OF RECORDS SENT TO THE CLIENT:"+data.time.length);
                res.json(data);
                return;
            }
            date = new Date(item.unixTimeSec * 1000);
            // Hours part from the timestamp
            var hours = date.getHours();
            if (hours < 10) { hours = "0" + hours }
            // Minutes part from the timestamp
            var minutes = date.getMinutes();
            if (minutes < 10) { minutes = "0" + minutes }
            // Seconds part from the timestamp
            var seconds = date.getSeconds();
            if (seconds < 10) { seconds = "0" + seconds }
            data.time.push(hours + ":" + minutes + ":" + seconds);
            data.viewerCount.push(item.viewerCount);
        });
    });
});

module.exports = router;
