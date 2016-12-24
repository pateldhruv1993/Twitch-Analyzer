var rawDataURL = 'https://raw.githubusercontent.com/plotly/datasets/master/2016-weather-data-seattle.csv';
var xField = 'Time';
var yField = 'Viwers';
var latestLogTimeViewerGraph = 0;
var latestLogTimeChatGraph = 0;


var selectorOptions = {
    /*buttons: [{
      step: 'month',
      stepmode: 'backward',
      count: 1,
      label: '1m'
    }, {
      step: 'month',
      stepmode: 'backward',
      count: 6,
      label: '6m'
    }, {
      step: 'year',
      stepmode: 'todate',
      count: 1,
      label: 'YTD'
    }, {
      step: 'year',
      stepmode: 'backward',
      count: 1,
      label: '1y'
    }, {
      step: 'all',
    }],*/
};

var streamName = "theonemanny";
$(document).ready(function () {
    $(window).resize(function () {
        //TODO: Doesnt work right now. Will have to come back later.
        Plotly.relayout('viewerGraph');
    });
    getPlotData({ stream: streamName, func: "viewerGraph", latestLogTime : 0  }, createViewersGraph);

    getPlotData({ stream: streamName, func: "chatGraph" }, createChartGraph);

    replotViewerGraphWithNewData();
    reploatChatGraphWithNewData();

});


function getPlotData(params, callback) {
    $.getJSON("api", params, function (data) {
        callback(data);
    });
}


function reploatChatGraphWithNewData() {
    getPlotData({ stream: streamName, func: "chatGraph", latestLogTime: latestLogTimeChatGraph }, function (data) {
        var plotData = [{
            mode: 'lines',
            x: data.time,
            y: data.chatCounts,
            name: "Chat Counts"
        }];
        chatGraph.data[0].x = data.time;
        chatGraph.data[0].y = data.chatCounts;
        latestLogTimeChatGraph = data.latestLogTime;
        Plotly.redraw(chatGraph);
    });
    setTimeout(reploatChatGraphWithNewData, 3000);
}

function replotViewerGraphWithNewData() {
    getPlotData({ stream: streamName, func: "viewerGraph", latestLogTime : 0/*latestLogTimeViewerGraph*/ }, function (data) {
        var plotData = [{
            mode: 'lines',
            x: data.time,
            y: data.viewerCount,
            name: "Viewers"
        }, {
            x: data.movingAvgTime,
            y: data.movingAvgPoints,
            mode: 'lines',
            line: {
                color: 'rgb(0, 255, 0)',
            },
            name: "Moving AVG 10"
        }, {
            x: data.movingAvgTime10,
            y: data.movingAvgPoints10,
            mode: 'lines',
            line: {
                color: 'rgb(0, 0, 0)',
            },
            name: "Moving AVG 20"
        }, {
            x: data.movingAvgTime20,
            y: data.movingAvgPoints20,
            mode: 'lines',
            line: {
                color: 'rgb(255, 0, 0)',
            },
            name: "Moving AVG"
        }];

        viewerGraph.data[0].x = data.time;
        viewerGraph.data[0].y = data.viewerCount;
        viewerGraph.data[1].x = data.movingAvgTime;
        viewerGraph.data[1].y = data.movingAvgPoints;
        viewerGraph.data[2].x = data.movingAvgTime10;
        viewerGraph.data[2].y = data.movingAvgPoints10;
        viewerGraph.data[3].x = data.movingAvgTime20;
        viewerGraph.data[3].y = data.movingAvgPoints20;

        latestLogTimeViewerGraph = data.latestLogTime;

        Plotly.redraw(viewerGraph);
    });
    setTimeout(replotViewerGraphWithNewData, 3000);
}

function prepData(rawData) {
    var x = [];
    var y = [];

    rawData.forEach(function (datum, i) {

        x.push(new Date(datum[xField]));
        y.push(datum[yField]);
    });

    return [{
        mode: 'lines',
        x: x,
        y: y
    }];
}


function createChartGraph(data) {
    var plotData = [{
        mode: 'lines',
        x: data.time,
        y: data.chatCounts,
        name: "Chat Messags Per 5 Sec"
    }];

    var xRangeOption2 = data.chatCounts.length;
    var xRangeOption1 = xRangeOption2 - 1000;
    if (xRangeOption1 < 0) {
        xRangeOption1 = 0;
    }

    var layout = {
        title: 'Chat Messages Per 5 Sec',
        xaxis: {
            showspikes: true,
            rangeselector: selectorOptions,
            rangeslider: {},
            range: [xRangeOption1, xRangeOption2]
        },
        yaxis: {
            showspikes: true,
            fixedrange: true
        }
    };

    Plotly.plot(chatGraph, plotData, layout);
}


function createViewersGraph(data) {
    var plotData = [{
        mode: 'lines',
        x: data.time,
        y: data.viewerCount,
        name: "Viewers"
    }, {
        x: data.movingAvgTime,
        y: data.movingAvgPoints,
        mode: 'lines',
        line: {
            color: 'rgb(0, 255, 0)'
        },
        name: "Moving AVG"
    }, {
        x: data.movingAvgTime10,
        y: data.movingAvgPoints10,
        mode: 'lines',
        line: {
            color: 'rgb(0, 0, 0)'
        },
        name: "Moving AVG 10"
    }, {
        x: data.movingAvgTime20,
        y: data.movingAvgPoints20,
        mode: 'lines',
        line: {
            color: 'rgb(255, 0, 0)'
        },
        name: "Moving AVG 100"
    }];

    var xRangeOption2 = data.viewerCount.length;
    var xRangeOption1 = xRangeOption2 - 1000;
    if (xRangeOption1 < 0) {
        xRangeOption1 = 0;
    }

    var layout = {
        title: 'Viewer Numbers',
        xaxis: {
            showspikes: true,
            rangeselector: selectorOptions,
            rangeslider: {},
            range: [xRangeOption1, xRangeOption2]
        },
        yaxis: {
            showspikes: true,
            fixedrange: true
        },
    };

    Plotly.plot(viewerGraph, plotData, layout);
}