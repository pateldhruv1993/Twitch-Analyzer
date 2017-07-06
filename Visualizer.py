import pymongo
import time
from sklearn import preprocessing
from numpy import ndarray
from pymongo import MongoClient
import matplotlib.pyplot as plt


streamer = 'moonmoon_ow'


client = MongoClient('mongodb://localhost:27017/')
db = client.local
chat_logs = db.chat_logs
clip_logs = db.clip_logs
stream_logs = db.stream_logs
viewer_logs = db.viewer_logs
min_max_scaler = preprocessing.MinMaxScaler(feature_range=(0, 1))

def getLatestStreamTimeAndVodId(streamer):
    for stream in stream_logs.find({"stream": streamer, "status": "start"}).sort("unixTimeSec", pymongo.DESCENDING):
        return {"startTime": stream["unixTimeSec"], "vod_id": stream["vod_id"]}


def processClips(clipLogs, streamLog):
    newClipLogs = {"views": [], "viewsNormalized": [],
                   "duration": [], "unixStartTime": [], "unixEndTime": []}
    for clip in clipLogs:
        newClipLogs["views"].append(clip["views"])
        newClipLogs["duration"].append(clip["duration"])

        unixStartTime = streamLog["startTime"] + clip["timeDelaySecs"]
        newClipLogs["unixStartTime"].append(unixStartTime)
        newClipLogs["unixEndTime"].append(round(unixStartTime + clip["duration"]))

    
    #viewsNormalized = min_max_scaler.fit_transform([np.float32(newClipLogs["views"]))])
    viewsNormalized = min_max_scaler.fit_transform(newClipLogs["views"])
    newClipLogs["viewsNormalized"] = viewsNormalized.tolist()
    return newClipLogs


def ScaleClipViews(clipLogs, data):
    for j in range(0, len(clipLogs["unixStartTime"])):        
        for i in range(0, len(data["unixTimeSec"])):
            if(clipLogs["unixStartTime"][j] <= data["unixTimeSec"][i] and clipLogs["unixEndTime"][j] >= data["unixTimeSec"][i]):
                data["normalizedClipViews"][i] = data["normalizedClipViews"][i] + clipLogs["viewsNormalized"][j]


def getStreamData(streamer):
    data = {"viewerCounts": [], "chatCounts": [],
            "unixTimeSec": [], "readableTime": [], "normalizedClipViews": []}
    streamLog = getLatestStreamTimeAndVodId(streamer)

    viewerCounts = list(viewer_logs.find(
        {"stream": streamer, "unixTimeSec": {"$gt": streamLog["startTime"]}}))
    chatCounts = list(chat_logs.find(
        {"stream": streamer, "unixTimeSec": {"$gt": streamLog["startTime"]}}))
    clipLogs = list(clip_logs.find(
        {"stream": streamer, "vod_id": streamLog["vod_id"]}).sort([("timeDelaySecs", 1)]))
    clipLogs = processClips(clipLogs, streamLog)

    counter = 0
    chatCounter = 0
    for chatCount in chatCounts:

        if(counter < len(viewerCounts)):
            if(counter + 1 > len(data["chatCounts"])):
                data["chatCounts"].append(0)

            if(chatCount["unixTimeSec"] <= viewerCounts[counter]["unixTimeSec"]):
                if(counter < len(data["chatCounts"])):
                    data["chatCounts"][counter] = data["chatCounts"][counter] + 1
            else:
                data["viewerCounts"].append(
                    viewerCounts[counter]["viewerCount"])
                data["unixTimeSec"].append(
                    viewerCounts[counter]["unixTimeSec"])
                data["readableTime"].append(time.strftime(
                    "%H:%M:%S", time.localtime(int(viewerCounts[counter]["unixTimeSec"]))))
                counter = counter + 1
            chatCounter = chatCounter + 1
    
    data["normalizedClipViews"] = [0] * len(data["unixTimeSec"])
    
    ScaleClipViews(clipLogs, data)

    return data


data = getStreamData(streamer)
data["viewerCountsNormalized"] = min_max_scaler.fit_transform(data["viewerCounts"]).tolist()
data["chatCountsNormalized"] = min_max_scaler.fit_transform(data["chatCounts"]).tolist()

plt.plot(data["unixTimeSec"], data["chatCountsNormalized"])
plt.plot(data["unixTimeSec"], data["viewerCountsNormalized"])
plt.plot(data["unixTimeSec"], data["normalizedClipViews"])
plt.ylabel('Normalized Viewers/Chat Counts/Clip Views')
plt.xlabel('Time')
plt.show()
