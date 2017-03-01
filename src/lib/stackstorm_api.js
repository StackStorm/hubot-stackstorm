"use strict";

var _ = require('lodash');
var util = require('util');
var env = _.clone(process.env);
var Promise = require('rsvp').Promise;
var utils = require('./utils.js');
var st2client = require('st2client');
var EventEmitter = require('events').EventEmitter;

// Setup the Environment
env.ST2_API = env.ST2_API || 'http://localhost:9101';
env.ST2_ROUTE = env.ST2_ROUTE || null;
env.ST2_WEBUI_URL = env.ST2_WEBUI_URL || null;

// Optional authentication info
env.ST2_AUTH_USERNAME = env.ST2_AUTH_USERNAME || null;
env.ST2_AUTH_PASSWORD = env.ST2_AUTH_PASSWORD || null;

// Optional authentication token
env.ST2_AUTH_TOKEN = env.ST2_AUTH_TOKEN || null;

// Optional API key
env.ST2_API_KEY = env.ST2_API_KEY || null;

// Optional, if not provided, we infer it from the API URL
env.ST2_AUTH_URL = env.ST2_AUTH_URL || null;

var START_MESSAGES = [
  "I'll take it from here! Your execution ID for reference is %s",
  "Got it! Remember %s as your execution ID",
  "I'm on it! Your execution ID is %s",
  "Let me get right on that. Remember %s as your execution ID",
  "Always something with you. :) I'll take care of that. Your ID is %s",
  "I have it covered. Your execution ID is %s",
  "Let me start up the machine! Your execution ID is %s",
  "I'll throw that task in the oven and get cookin'! Your execution ID is %s",
  "Want me to take that off your hand? You got it! Don't forget your execution ID: %s",
  "River Tam will get it done with her psychic powers. Your execution ID is %s"
];

var ERROR_MESSAGES = [
  "I'm sorry, Dave. I'm afraid I can't do that. {~} %s"
];


function StackStormApi(logger) {
  var self = this;
  self.logger = logger;
  var url = utils.parseUrl(env.ST2_API);

  var opts = {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port,
    prefix: url.path,
    rejectUnauthorized: false
  };

  self.api = st2client(opts);
  if (env.ST2_API_KEY) {
    self.api.setKey({ key: env.ST2_API_KEY });
  } else if (env.ST2_AUTH_TOKEN) {
    self.api.setToken({ token: env.ST2_AUTH_TOKEN });
  }

  if (env.ST2_API_KEY || env.ST2_AUTH_TOKEN || env.ST2_AUTH_USERNAME || env.ST2_AUTH_PASSWORD) {
    // If using username and password then all are required.
    if ((env.ST2_AUTH_USERNAME || env.ST2_AUTH_PASSWORD) &&
      !(env.ST2_AUTH_USERNAME && env.ST2_AUTH_PASSWORD && env.ST2_AUTH_URL)) {
      throw new Error('Env variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD and ST2_AUTH_URL should only be used together.');
    }
  }

  EventEmitter.call(this);
}

util.inherits(StackStormApi, EventEmitter);

StackStormApi.prototype.startListener = function start() {
  var self = this;
  return self.api.stream.listen()
    .catch(function (err) {
      self.logger.error('Unable to connect to stream:', err);
    })
    .then(function (source) {
      source.onerror = function (err) {
        // TODO: squeeze a little bit more info out of evensource.js
        self.logger.error('Stream error:', err);
      };
      source.addEventListener('st2.announcement__chatops', function (e) {
        var data;

        self.logger.debug('Chatops message received:', e.data);

        if (e.data) {
          data = JSON.parse(e.data).payload;
        } else {
          data = e.data;
        }

        self.emit('st2.chatops_announcement', data);
      });
      return source;
    })
    .then(function (source) {
      // source.removeAllListeners();
      // source.close();
    });
};

StackStormApi.prototype.getAliases = function () {
  var self = this;

  self.logger.info('Getting Action Aliases....');
  return self.api.actionAlias.list()
    .catch(function (err) {
      var error_msg = 'Failed to retrieve commands from "%s": %s';
      self.logger.error(util.format(error_msg, env.ST2_API, err.message));
      return [];
    });
};

StackStormApi.prototype.sendAck = function (msg, res) {
  res.execution.web_url = env.ST2_WEBUI_URL;
  var history_url = utils.getExecutionHistoryUrl(res.execution);
  var history = history_url ? util.format(' (details available at %s)', history_url) : '';

  if (res.actionalias && res.actionalias.ack) {
    if (res.actionalias.ack.enabled === false) {
      return;
    } else if (res.actionalias.ack.append_url === false) {
      history = '';
    }
  }

  if (res.message) {
    return msg.send(res.message + history);
  }

  var message = util.format(_.sample(START_MESSAGES), res.execution.id);
  return msg.send(message + history);
};

// TODO: decouple the msg object from stackstorm api, this should use an event emitter
StackStormApi.prototype.executeCommand = function (msg, alias_name, command_format_string, command, addressee) {
  var self = this;
  var payload = {
    'name': alias_name,
    'format': command_format_string,
    'command': command,
    'user': addressee.name,
    'source_channel': addressee.room,
    'notification_route': env.ST2_ROUTE || 'hubot'
  };

  self.logger.debug('Sending command payload:', JSON.stringify(payload));

  return self.api.aliasExecution.create(payload)
    .then(function (res) { self.sendAck(msg, res); })
    .catch(function (err) {
      if (err.status === 200) {
        return self.sendAck(msg, { execution: { id: err.message } });
      }
      self.logger.error('Failed to create an alias execution:', err);
      var message = util.format(_.sample(ERROR_MESSAGES), err.message);
      if (err.requestId) {
        message = util.format(
          message,
          util.format('; Use request ID %s to grep st2 api logs.', err.requestId));
      }
      self.emit('st2.execution_error', {
        name: alias_name,
        format_string: command_format_string,
        message: message,
        addressee: addressee,
        command: command
      });
      throw err;
    });
};

StackStormApi.prototype.authenticate = function authenticate() {
  var self = this;
  self.api.removeListener('expiry', authenticate);

  // API key gets precedence 1
  if (env.ST2_API_KEY) {
    self.logger.info('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
    return Promise.resolve();
  }
  // Auth token gets precedence 2
  if (env.ST2_AUTH_TOKEN) {
    self.logger.info('Using ST2_AUTH_TOKEN as authentication. Expiry will lead to bot exit.');
    return Promise.resolve();
  }

  self.logger.info('Requesting a token...');

  var url = utils.parseUrl(env.ST2_AUTH_URL);

  var client = st2client({
    auth: {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port,
      prefix: url.path
    }
  });

  return client.authenticate(env.ST2_AUTH_USERNAME, env.ST2_AUTH_PASSWORD)
    .then(function (token) {
      self.logger.info('Token received. Expiring ' + token.expiry);
      self.api.setToken(token);
      client.on('expiry', self.authenticate);
    })
    .catch(function (err) {
      self.logger.error('Failed to authenticate: ' + err.message);
      throw err;
    });
};

module.exports = StackStormApi;