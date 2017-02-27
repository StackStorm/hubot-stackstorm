"use strict";

var _ = require('lodash'),
  util = require('util'),
  env = _.clone(process.env),
  Promise = require('rsvp').Promise,
  utils = require('./utils.js'),
  st2client = require('st2client'),
  EventEmitter = require('events').EventEmitter
  ;

// Setup the Environment
env.ST2_API = env.ST2_API || 'http://localhost:9101';
env.ST2_ROUTE = env.ST2_ROUTE || null;
env.ST2_ROUTE = env.ST2_WEBUI_URL || null;

// Optional authentication info
env.ST2_AUTH_USERNAME = env.ST2_AUTH_USERNAME || null;
env.ST2_AUTH_PASSWORD = env.ST2_AUTH_PASSWORD || null;

// Optional authentication token
env.ST2_AUTH_TOKEN = env.ST2_AUTH_TOKEN || null;

// Optional API key
env.ST2_API_KEY = env.ST2_API_KEY || null;

// Optional, if not provided, we infer it from the API URL
env.ST2_AUTH_URL = env.ST2_AUTH_URL || null;

function StackStormApi(logger) {
  this.logger = logger;
  var url = utils.parseUrl(env.ST2_API);

  var opts = {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port,
    prefix: url.path,
    rejectUnauthorized: false
  };

  this.api = st2client(opts);
  if (env.ST2_API_KEY) {
    this.api.setKey({ key: env.ST2_API_KEY });
  } else if (env.ST2_AUTH_TOKEN) {
    this.api.setToken({ token: env.ST2_AUTH_TOKEN });
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

StackStormApi.prototype.start = function start() {
  var self = this;
  self.api.stream.listen().catch(function (err) {
    self.logger.error('Unable to connect to stream:', err);
  }).then(function (source) {
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

      self.emit('chatops_announcement', data);

      // Special handler to try and figure out when a hipchat message
      // is a whisper:

      // TODO: move to postdata logic or in the event listener
      // if (this.robot.adapterName === 'hipchat' && !data.whisper && data.channel.indexOf('@') > -1) {
      //   data.whisper = true;
      //   this.robot.logger.debug('Set whisper to true for hipchat message');
      // }
    });
  });
};

StackStormApi.prototype.getAliases = function () {
  this.logger.info('Loading commands....');
  return this.api.actionAlias.list()
    .catch(function (err) {
      var error_msg = 'Failed to retrieve commands from "%s": %s';
      this.logger.error(util.format(error_msg, env.ST2_API, err.message));
      return [];
    });
};

StackStormApi.prototype.sendAck = function (msg, res) {
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

StackStormApi.prototype.createExecution = function (msg, payload) {
  this.logger.debug('Sending command payload:', JSON.stringify(payload));

  return this.api.aliasExecution.create(payload)
    .then(function (res) { this.sendAck(msg, res); })
    .catch(function (err) {
      // Compatibility with older StackStorm versions
      if (err.status === 200) {
        return this.sendAck(msg, { execution: { id: err.message } });
      }
      this.logger.error('Failed to create an alias execution:', err);
      var addressee = utils.normalizeAddressee(msg, robot.adapterName);
      var message = util.format(_.sample(ERROR_MESSAGES), err.message);
      if (err.requestId) {
        message = util.format(
          message,
          util.format('; Use request ID %s to grep st2 api logs.', err.requestId));
      }
      this.postDataHandler.postData({
        whisper: false,
        user: addressee.name,
        channel: addressee.room,
        message: message,
        extra: {
          color: '#F35A00'
        }
      });
      throw err;
    });
};

StackStormApi.prototype.executeCommand = function (msg, command_name, format_string, command, action_alias) {
  var addressee = utils.normalizeAddressee(msg, this.robot.adapterName);
  var payload = {
    'name': command_name,
    'format': format_string,
    'command': command,
    'user': addressee.name,
    'source_channel': addressee.room,
    'notification_route': env.ST2_ROUTE || 'hubot'
  };

  return this.createExecution(msg, payload);
};

StackStormApi.prototype.authenticate = function authenticate() {
  this.api.removeListener('expiry', authenticate);

  // API key gets precedence 1
  if (env.ST2_API_KEY) {
    this.logger.info('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
    return Promise.resolve();
  }
  // Auth token gets precedence 2
  if (env.ST2_AUTH_TOKEN) {
    this.logger.info('Using ST2_AUTH_TOKEN as authentication. Expiry will lead to bot exit.');
    return Promise.resolve();
  }

  this.logger.info('Requesting a token...');

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
      this.logger.info('Token received. Expiring ' + token.expiry);
      this.api.setToken(token);
      client.on('expiry', this.authenticate);
    })
    .catch(function (err) {
      this.logger.error('Failed to authenticate: ' + err.message);

      throw err;
    });
};