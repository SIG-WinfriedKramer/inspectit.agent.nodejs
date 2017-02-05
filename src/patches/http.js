var logger = require('log4js').getLogger('inspectIT');

/**
 * Patches the http module.
 */
var patch = function (module, tracer) {
    var httpRequest = module.request;
    module.request = function (options, cb) {

        var span = tracer.startSpan('http_request');
        span.addTags({
            host: options.host,
            port: options.port,
            path: options.path
        });

        // START
        return httpRequest(options, function (res) {
            if (typeof cb === "function")
                cb(res);

            res.on('data', (chunk) => {
            });

            res.on('end', (err) => {
                span.logEvent('request_end', err);
                span.finish();
            });
        });
    };

    return module;
};

module.exports = patch;