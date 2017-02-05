require('./src/inspectit-agent.js').init();

var express = require('express')
var app = express()
var http = require('http');

var port = 3333;

app.get('/', function (req, response) {

  http.request({
    host: 'localhost',
    port: 8182,
    path: '/rest/cmr/status',
  }, function (res) {
    var data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      response.send('Proxy CMR Status: ' + data);
    });
  }).end();
})

app.get('/hello', function (req, res) {
  res.send('Hello World2!')
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!')
})