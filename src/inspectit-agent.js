var cls = require('continuation-local-storage').createNamespace('inspectit');

var Module = require('module');
var shimmer = require('shimmer');
var request = require('request');
var os = require('os');
var http = require('http');
var uuid = require('node-uuid');

var InspectITTracer = require('./inspectit-tracer');
var tracer = new InspectITTracer();

function print_r(printthis, returnoutput) {
  var output = '';

  if ($.isArray(printthis) || typeof (printthis) == 'object') {
    for (var i in printthis) {
      output += i + ' : ' + print_r(printthis[i], true) + '\n';
    }
  } else {
    output += printthis;
  }
  if (returnoutput && returnoutput == true) {
    return output;
  } else {
    alert(output);
  }
}

function getAllMethods(object) {
  return Object.getOwnPropertyNames(object).filter(function (property) {
    return typeof object[property] == 'function';
  });
};

// handle
var handle = function (module, arguments) {
  // inject inspectit property
  if (!("_inspectit" in module)) {
    module._inspectit = {
      'isInstrumented': false,
      'moduleName': arguments[0],
      'filename': arguments[1].filename
    };

    console.log('> Injected inspectIT agent into ' + module._inspectit.moduleName);
  }

  if (module._inspectit.isInstrumented) {
    return module;
  }

  if (arguments[0] == 'express') {
    module = handleExpress(module);
  } else if (arguments[0] == 'http') {
    module = handleHttp(module);
  }

  module._inspectit.isInstrumented = true;

  return module;
};

// handle http
var handleHttp = function (module) {
  console.log('>http');

  var httpRequest = http.request;
  http.request = function (options, cb) {

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

// handle express
var handleExpress = function (module) {

  //for (var k in module) console.log(k);
  //console.log(getAllMethods(module));

  shimmer.wrap(module.application, 'handle', function (original) {
    return function () {
      var req = arguments[0];
      var res = arguments[1];
      var callback = arguments[2];

      // attach cls
      cls.bindEmitter(req); //request
      cls.bindEmitter(res); //response

      var tid = uuid.v4();

      // pass vars into closure
      var handleArguments = arguments;
      var handleFunction = this;

      cls.run(function () {
        console.log('set tid');
        cls.set('transactionId', tid);

        // remote address
        var remoteAddress = (req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress).replace(/^.*:/, '');

        var span = tracer.startSpan('express_request');
        span.addTags({
          req_url: req.url,
          req_method: req.method,
          req_headers: req.headers,
          req_remoteAddress: remoteAddress
        });

        // 
        res.on('finish', () => {
          span.setTag('res_statusCode', res.statusCode);
          span.finish();
        });

        // handle request
        var result = original.apply(handleFunction, handleArguments)

        // var endTime = process.hrtime();
        // var durationMs = (endTime[0] - startTime[0]) * 1000 + (endTime[1] - startTime[1]) / 1000000;



        // console.log('> Processed request');
        // console.log('|- url: ' + req_url);
        // console.log('|- method: ' + req_method);
        // console.log('|- remote ip: ' + req_remoteAddress);
        // console.log('|- header size: ' + Object.keys(req_headers).length);
        // console.log('|- status code: ' + res_statusCode);
        // console.log('|- duration: ' + durationMs);



        return result;
      });
    };
  });

  // patch express application
  // var patchedExpress = function () {
  //   console.log('>>>>>>>>>>>>>>>>>>>create app');

  //   application = module.apply(this, arguments)

  //   application.use(function (req, res, next) {
  //     cls.bindEmitter(req);
  //     cls.bindEmitter(res);

  //     var tid = uuid.v4();

  //     cls.run(function () {
  //       cls.set('transactionId', tid);
  //       next();
  //     });
  //   });

  //   return application;
  // };
  //patchedExpress._inspectit = module._inspectit;

  return module;
};

module.exports = {
  // init
  init: function () {
    console.log('Initializing inspectIT agent.');

    // make nice
    var ip = os.networkInterfaces()['Wireless Network Connection 3'][0].address;

    var options = {
      url: 'http://localhost:8182/rest/data/registration/register',
      method: 'POST',
      headers: {
        'User-Agent': 'Super Agent/0.0.1'
      },
      json: true,
      body: {
        'ips': [ip],
        'name': 'Node Agent',
        'version': 'v1'
      }
    }

    request(options, function (error, response, agentId) {
      if (!error && response.statusCode == 200) {
        console.log('> Registered inspectIT agent with id ' + agentId);
      } else {
        console.error(error);
      }
    })

    /*
        var r = require;
        require = function(module_name) {
          console.log("> " + module_name);
          return r(module_name);
        };*/


    var originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      //console.log("> " + request);

      var requestedModule = originalLoad(request, parent, isMain);

      if (arguments[0] == 'express' || arguments[0] == 'http') {
        requestedModule = handle(requestedModule, arguments);
      }

      return requestedModule;
    };

    /*
        shimmer.wrap(Module, '_load', function(original) {
          return function() {
            console.log("Loading module " + arguments[0]);

            var module = original.apply(this, arguments)

            if (arguments[0] == 'express') {
              handle(module, arguments);
            }

            return module;
          };
        });*/

  }
};
