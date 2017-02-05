# NodeJS Agent for inspectIT

This is an experimental agent for inspectIT to gather data and trace requests from and over NodeJS applications.

At the moment, the duration and parameter of requests handled by _express_ and send by the _http_ module can be captured.

In order to use the agent, add the following code at the beginning of the NodeJS application.

```javascript
require('./src/inspectit-agent.js').init({
  cmrHost: '127.0.0.1',
  cmrPort: 8182,
  logDirectory: './logs'
});
```