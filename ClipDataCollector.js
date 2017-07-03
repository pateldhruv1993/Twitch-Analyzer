var request = require("request");
var DBManager = require("./DatabaseManager");
var config = require("./config");

DBManager.connectToServer("mongodb://localhost:27017/local", function (err) {
    if (!err) {
        db = DBManager.getDb();
        getPopularClips("moonmoon_ow", "month", 100, null,function (data) {
            if (data.clips !== undefined) {
                data.clips.forEach(function (clip) {
                    addClipToDB(clip);
                }, this);
            } else {
                console.log("ERROR: clips is undefined");
                console.log(data);
            }
        })
    }
});


function getPopularClips(streamName, timeFrame, limit, cursor, callback) {
    var uri = 'https://api.twitch.tv/kraken/clips/top?channel=' + streamName + '&period=' + timeFrame + '&limit=' + limit;
    if(cursor != null){
        uri = 'https://api.twitch.tv/kraken/clips/top?channel=' + streamName + '&period=' + timeFrame + '&limit=' + limit + '&cursor=' + cursor;
    }
    request({
        headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Client-ID': config.twitch.clientId
        },
        uri: uri,
        method: 'GET'
    }, function (error, response, body) {
        //it works!
        if (!error && response.statusCode === 200) {
            var unparsedBody = body;
            body = JSON.parse(body);
            //console.log(unparsedBody);
            if((body._cursor !== undefined || body._cursor != null) && body._cursor.length != 0){
                //console.log("================================================= Another pass on clips API. Clip Cursor: " + body._cursor + ", Cursor length: " + body._cursor.length + " =========================")
                getPopularClips(streamName, timeFrame, limit, body._cursor, callback);
            } else{
                console.log("End of multi-page clips API call.");
            }
            callback(body);
        } else {
            console.log("ERROR: While getting Clips data for streamer: " + streamName + " and timeFrame:" + timeFrame);
            console.log("URL = " + uri);
        }
    });
}


function addClipToDB(data) {
    var streamName = data.broadcaster.name;
    var unixTimeSec = Math.floor((new Date(data.created_at) / 1000));


    db.collection("clip_logs").find({
        'clip_slug': data.slug
    }).count(function (error, numOfDocs) {
        if (numOfDocs == 0) {
            if (data.vod != null) {
                console.log(streamName + "'s STREAM WAS CREATED ON:" + unixTimeSec);
                var clipLog = {
                    unixTimeSec: unixTimeSec,
                    stream: streamName,
                    views: data.views,
                    duration: data.duration,
                    created_at: data.created_at,
                    vod_url: data.vod.url,
                    vod_id: data.vod.id,
                    clip_slug: data.slug
                };
                
                var timestampInSecs = data.vod.url.substring(data.vod.url.indexOf("?t=") + 3);
                clipLog.timeDelaySecs = convertTimeStampToSeconds(timestampInSecs);

                DBManager.insertData(clipLog, "clip_logs");
            } else {
                console.log("Vod Deleted?");
            }
        }
    });
}



function convertTimeStampToSeconds(timestamp){
    var h = m = s  = 0;
    var hp, mp, sp = -1;
    
    hp = timestamp.indexOf("h");
    if(hp != -1){
        h = timestamp.substring(0, hp);
    }

    mp = timestamp.indexOf("m");
    if(mp != -1){   
        m = timestamp.substring(hp + 1 ,mp);
    }
    
    sp = timestamp.indexOf("s");
    if(sp != -1){
        s = timestamp.substring(mp + 1, sp);
    }
    
    return ((parseInt(h) * 60 * 60) + (parseInt(m) * 60) + parseInt(s));
}