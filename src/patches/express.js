var logger = require('log4js').getLogger('inspectIT');

var clStorage = require('continuation-local-storage').getNamespace('inspectit');
var shimmer = require('shimmer');
var uuid = require('node-uuid');

/**
 * Patches the express module.
 */
var patch = function (module, tracer) {
    shimmer.wrap(module.application, 'handle', function (original) {
        return function () {
            var req = arguments[0];
            var res = arguments[1];
            var callback = arguments[2];

            // attach clStorage
            clStorage.bindEmitter(req); //request
            clStorage.bindEmitter(res); //response

            var tid = uuid.v4();

            // pass vars into closure
            var handleArguments = arguments;
            var handleFunction = this;

            clStorage.run(function () {
                // set trace id in context
                clStorage.set('transactionId', tid);

                // remote address
                var remoteAddress = (req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress).replace(/^.*:/, '');

                // start span
                var span = tracer.startSpan('express_request');
                span.addTags({
                    req_url: req.url,
                    req_method: req.method,
                    req_headers: req.headers,
                    req_remoteAddress: remoteAddress
                });

                // catch finish event to finalize the span
                res.on('finish', () => {
                    span.setTag('res_statusCode', res.statusCode);
                    span.finish();
                });

                // handle request
                var result = original.apply(handleFunction, handleArguments)

                return result;
            });
        };
    });

    return module;
};

module.exports = patch;