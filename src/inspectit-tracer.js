var Span = require('./inspectit-span');
var cls = require('continuation-local-storage').getNamespace('inspectit');

var logger = require('log4js').getLogger('inspectIT');

var tracer = InspectITTracer.prototype;

function InspectITTracer() {
}

tracer.startSpan = function (name, fields) {
    /*if (fields.parent) {
        fields.parent = fields.parent.imp()
    }*/

    currentTransactionId = cls.get('transactionId');

    var span = new Span(this, name, currentTransactionId);

    return span;
};

tracer.inject = function (span, format, carrier) {
    if (format === this._interface.FORMAT_TEXT_MAP) {
        this._textPropagator.inject(span, carrier)
    } else if (format === this._interface.FORMAT_BINARY) {
        this._binaryPropagator.inject(span, carrier)
    }
};

tracer.extract = function (format, carrier) {
};

tracer.store = function (span) {
    logger.trace('Received span:', (span));
};

module.exports = InspectITTracer;