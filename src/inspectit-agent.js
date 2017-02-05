var cls = require('continuation-local-storage').createNamespace('inspectit');

// load logger
var log4js = require('log4js');
var logger = log4js.getLogger('inspectIT');

// load libraries
var _ = require('lodash');
var Module = require('module');
var shimmer = require('shimmer');
var os = require('os');
var http = require('http');
var packageJson = require('../package.json');
var fs = require('fs');

var InspectITTracer = require('./inspectit-tracer');


// ########################################
// ###   agent properties
// ########################################

var tracer = new InspectITTracer();

var configuration;

var agentId;

var availablePatches = [];

// ########################################
// ###   functions
// ########################################

/**
 * Injects the agent in the given module.
 * @param module - the original module
 * @param arguments - the arguments which were used to call the _load function
 */
var injectAgent = function (module, arguments) {
  // adding inspectIT properties to module
  if (!("_inspectit" in module) || !module._inspectit.isPatched) {
    module._inspectit = {
      'isPatched': false,
      'moduleName': arguments[0],
      'filename': arguments[1].filename
    };
  }

  // do nothing if module has been already patched
  if (module._inspectit.isPatched) {
    return module;
  }

  // patch module
  logger.debug('Patching the "' + arguments[0] + '" module..');
  var modulePatch = require('./patches/' + arguments[0]);
  modulePatch(module, tracer);

  // set patched flag
  module._inspectit.isPatched = true;
  return module;
};

/**
 * Registers the agent on the CMR.
 */
var registerAgent = function () {
  // make nice
  var ip = os.networkInterfaces()['Wireless Network Connection 3'][0].address;

  var data = JSON.stringify({
    'ips': [ip],
    'name': 'Node Agent',
    'version': packageJson.version
  });

  // Set up the request
  var request = http.request({
    host: configuration.cmrHost,
    port: configuration.cmrPort,
    path: '/rest/data/registration/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, function (res) {
    var fullResponse = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      fullResponse += chunk;
    });
    res.on('end', function () {
      agentId = fullResponse;
      logger.debug('Agent registered with id ' + agentId);
    });
  });

  // post the data
  request.write(data);
  request.end();
};

/**
 * Lookup of all available patches in the ./patches/ direcotry.
 */
var lookupAvailablePatches = function () {
  logger.debug('Loading all available patches:');

  var patchDirectory = __dirname + '/patches';
  var files = fs.readdirSync(patchDirectory);

  for (var i in files) {
    //var moduleName = (files[i].split('.')[0]).split('-')[1];
    var moduleName = files[i].split('.')[0];
    availablePatches.push(moduleName);
    logger.debug('|- ' + moduleName);
  }
};

/**
 * Patches the Module_load function. This is the entry point of the inspectIT agent.
 */
var patchLoadingProcess = function () {
  shimmer.wrap(Module, '_load', function (original) {
    return function () {
      var module = original.apply(this, arguments)

      if ("_inspectit" in module && module._inspectit.isPatched) {
        return module;
      }

      if (_.includes(availablePatches, arguments[0])) {
        module = injectAgent(module, arguments);
      }

      return module;
    };
  });
};

module.exports = {
  /**
   * Initializes the inspectIT agent.
   * @param config - the configuration of the agent
   */
  init: function (config) {
    logger.info('* * * * * * * * * * * * * * * * * * * * * * * * * * * *');
    logger.info('* * * * * *  THIS IS AN EXPERIMENTAL AGENT  * * * * * *');
    logger.info('* * * * * * * * * * * * * * * * * * * * * * * * * * * *');

    configuration = config;

    // setup logger
    if (configuration.logDirectory) {
      if (!fs.existsSync(configuration.logDirectory)) {
        fs.mkdirSync(configuration.logDirectory);
      }
      log4js.loadAppender('file');
      log4js.addAppender(log4js.appenders.file('logs/inspectIT.log'), 'inspectIT');
    }
    logger.info('inspectIT NodeJS-agent (v' + packageJson.version + ') is running.');

    registerAgent();

    lookupAvailablePatches();

    patchLoadingProcess();
  }
};
