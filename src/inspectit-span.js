var uuid = require('node-uuid');
var clone = require('lodash.clone');

var span = Span.prototype;


function Span(tracer, operationName, transactionId, tags, startTime) {
    if (typeof startTime === "undefined")
        startTime = Date.now();

    this._tracer = tracer
    this._operationName = operationName
    this._startTime = startTime;

    if (typeof transactionId === 'undefined' || !transactionId) {
        transactionId = uuid.v4();
    }

    this._traceId = transactionId;
    this._spanId = uuid.v4();

    // if (parent) {
    //     this.traceId = parent.traceId
    //     this.spanId = uuid.v4();
    //     // this.parentId = parent.spanId
    // } else {
    //     this.traceId = transactionId;
    //     this.spanId = uuid.v4();
    //     this.baggage = {}
    // }

    this.addTags(tags);
};

span.tracer = function () {
    return this._tracer;
};

span.setOperationName = function (name) {
    this._operationName = name
};

span.setTag = function (key, value) {
    if (!this._tags) {
        this._tags = {}
    }
    this._tags[key] = value
};

span.addTags = function (keyValuePairs) {
    for (var key in keyValuePairs) {
        this.setTag(key, keyValuePairs[key])
    }
};

span.setBaggageItem = function (key, value) {
    //this.baggage[key] = value
};

span.getBaggageItem = function (key) {
    //return this.baggage[key]
};

span.logEvent = function (event, payload, timestamp) {
    /* if (typeof timestamp === "undefined")
         timestamp = Date.now();
 
     if (!this.logs) {
         this.logs = []
     }
     this.logs.push({
         event,
         payload,
         timestamp,
     })*/
};

span.finish = function (finishTime) {
    if (typeof finishTime === "undefined")
        finishTime = Date.now();

    this._duration = finishTime - this._startTime
    this._tracer.store(this)
};


module.exports = Span;