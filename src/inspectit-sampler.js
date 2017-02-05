var logger = require('log4js').getLogger('inspectIT');
var os = require('os');
var _ = require('lodash');

var sampleInterval;

var inspectITAgent;

var cpuStatsBuffer;

var currentCpuStats;

var start = function (agent) {
    logger.debug('Started inspectIT sampler.');

    inspectITAgent = agent;

    sampleInterval = setInterval(doSample, 5000);
};

var doSample = function () {
    logger.trace('Sample CPU statistics...');

    var first = typeof cpuStatsBuffer === 'undefined';
    if (first) {
        cpuStatsBuffer = [];
        currentCpuStats = [];
    }

    var cpuStats = os.cpus();

    for (var i in cpuStats) {
        var stats = cpuStats[i].times;

        if (first) {
            cpuStatsBuffer.push({
                user: stats.user,
                nice: stats.nice,
                sys: stats.sys,
                idle: stats.idle,
                irq: stats.irq
            });
        } else {
            cpuStatsBuffer[i] = {
                user: stats.user - cpuStatsBuffer[i].user,
                nice: stats.nice - cpuStatsBuffer[i].nice,
                sys: stats.sys - cpuStatsBuffer[i].sys,
                idle: stats.idle - cpuStatsBuffer[i].idle,
                irq: stats.irq - cpuStatsBuffer[i].irq
            }

            var total = cpuStatsBuffer[i].user + cpuStatsBuffer[i].nice + cpuStatsBuffer[i].sys + cpuStatsBuffer[i].idle + cpuStatsBuffer[i].irq;

            currentCpuStats[i] = {
                user: 100.0 / total * cpuStatsBuffer[i].user,
                nice: 100.0 / total * cpuStatsBuffer[i].nice,
                sys: 100.0 / total * cpuStatsBuffer[i].sys,
                idle: 100.0 / total * cpuStatsBuffer[i].idle,
                irq: 100.0 / total * cpuStatsBuffer[i].irq
            };
        }
    }

    inspectITAgent.storeSample(currentCpuStats);
};

module.exports = {
    start: start
};