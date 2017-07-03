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


def getLatestStreamTime(streamer):
    for streams in stream_logs.find({"stream": streamer}).sort("unixTimeSec", pymongo.DESCENDING):
        return (streams["unixTimeSec"])
        break



def getMergedViewersAndChatCount(streamer):
    data = {"viewerCounts": [], "chatCounts": [], "unixTimeSec": [], "readableTime": []}
    viewerCounts = list(viewer_logs.find(
        {"stream": streamer, "unixTimeSec": {"$gt": getLatestStreamTime(streamer)}}))
    chatCounts = list(chat_logs.find(
        {"stream": streamer, "unixTimeSec": {"$gt": getLatestStreamTime(streamer)}}))
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
                data["viewerCounts"].append(viewerCounts[counter]["viewerCount"])
                data["unixTimeSec"].append(viewerCounts[counter]["unixTimeSec"])                
                data["readableTime"].append(time.strftime("%H:%M:%S", time.localtime(int(viewerCounts[counter]["unixTimeSec"]))))
                counter = counter + 1
            chatCounter = chatCounter + 1
        
    return data

data = getMergedViewersAndChatCount(streamer)
data["viewerCountsNormalized"] = list(preprocessing.normalize(data["viewerCounts"]))
data["chatCountsNormalized"] = list(preprocessing.normalize(data["chatCounts"]))
plt.plot(data["unixTimeSec"], data["chatCountsNormalized"][0])
plt.plot(data["unixTimeSec"], data["viewerCountsNormalized"][0])
plt.ylabel('Normalized Viewers/Chat Counts/Clip  Views')
plt.xlabel('Time')
plt.show()
