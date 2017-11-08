// Licensed to the StackStorm, Inc ('StackStorm') under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Description:
//   StackStorm hubot integration
//
// Dependencies:
//
//
// Configuration:
//   ST2_API - FQDN + port to StackStorm endpoint
//   ST2_ROUTE - StackStorm notification route name
//   ST2_COMMANDS_RELOAD_INTERVAL - Reload interval for commands
//
// Notes:
//   Command list is automatically generated from StackStorm ChatOps metadata
//

"use strict";

var _ = require('lodash'),
  util = require('util'),
  env = _.clone(process.env),
  Promise = require('rsvp').Promise,
  utils = require('../lib/utils.js'),
  slack_monkey_patch = require('../lib/slack_monkey_patch.js'),
  formatCommand = require('../lib/format_command.js'),
  formatData = require('../lib/format_data.js'),
  postData = require('../lib/post_data.js'),
  CommandFactory = require('../lib/command_factory.js'),
  st2client = require('st2client'),
  uuid = require('uuid')
  ;

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

// slack attachment colors
env.ST2_SLACK_SUCCESS_COLOR = env.ST2_SLACK_SUCCESS_COLOR || 'dfdfdf';
env.ST2_SLACK_FAIL_COLOR = env.ST2_SLACK_FAIL_COLOR || 'danger';

// Optional, if not provided, we infer it from the API URL
env.ST2_AUTH_URL = env.ST2_AUTH_URL || null;

// Command reload interval in seconds
env.ST2_COMMANDS_RELOAD_INTERVAL = parseInt(env.ST2_COMMANDS_RELOAD_INTERVAL || 120, 10);

// Cap message length to a certain number of characters.
env.ST2_MAX_MESSAGE_LENGTH = parseInt(env.ST2_MAX_MESSAGE_LENGTH || 500, 10);

// Constants
// Fun human-friendly commands. Use %s for payload output.
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

var TWOFACTOR_MESSAGE = "This action requires two-factor auth! Waiting for your confirmation.";


module.exports = function(robot) {
  slack_monkey_patch.patchSendMessage(robot);

  var self = this;

  var promise = Promise.resolve();

  var url = utils.parseUrl(env.ST2_API);

  var opts = {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port,
    prefix: url.path,
    rejectUnauthorized: false
  };

  var api = st2client(opts);

  if (env.ST2_API_KEY) {
    api.setKey({ key: env.ST2_API_KEY });
  } else if (env.ST2_AUTH_TOKEN) {
    api.setToken({ token: env.ST2_AUTH_TOKEN });
  }

  function authenticate() {
    api.removeListener('expiry', authenticate);

    // API key gets precedence 1
    if (env.ST2_API_KEY) {
      robot.logger.info('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
      return Promise.resolve();
    }
    // Auth token gets precedence 2
    if (env.ST2_AUTH_TOKEN) {
      robot.logger.info('Using ST2_AUTH_TOKEN as authentication. Expiry will lead to bot exit.');
      return Promise.resolve();
    }

    robot.logger.info('Requesting a token...');

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
        robot.logger.info('Token received. Expiring ' + token.expiry);
        api.setToken(token);
        client.on('expiry', authenticate);
      })
      .catch(function (err) {
        robot.logger.error('Failed to authenticate: ' + err.message);

        throw err;
      });
  }

  if (env.ST2_API_KEY || env.ST2_AUTH_TOKEN || env.ST2_AUTH_USERNAME || env.ST2_AUTH_PASSWORD) {
    // If using username and password then all are required.
    if ((env.ST2_AUTH_USERNAME || env.ST2_AUTH_PASSWORD) &&
        !(env.ST2_AUTH_USERNAME && env.ST2_AUTH_PASSWORD && env.ST2_AUTH_URL)) {
      throw new Error('Env variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD and ST2_AUTH_URL should only be used together.');
    }
    promise = authenticate();
  }

  // Pending 2-factor auth commands
  if (env.HUBOT_2FA) {
    var twofactor = {};
    robot.logger.info('Two-factor auth is enabled');
  }

  // factory to manage commands
  var command_factory = new CommandFactory(robot);

  // formatter to manage per adapter message formatting.
  var formatter = formatData.getFormatter(robot.adapterName, robot);

  // handler to manage per adapter message post-ing.
  var postDataHandler = postData.getDataPostHandler(robot.adapterName, robot, formatter);

  var loadCommands = function() {
    robot.logger.info('Loading commands....');

    api.actionAlias.list()
      .then(function (aliases) {
        // Remove all the existing commands
        command_factory.removeCommands();

        _.each(aliases, function (alias) {
          var name = alias.name;
          var formats = alias.formats;
          var description = alias.description;
          var command;
          var re;

          if (alias.enabled === false) {
            return;
          }

          if (!formats || formats.length === 0) {
            robot.logger.error('No formats specified for command: ' + name);
            return;
          }

          _.each(formats, function (format) {
            command = formatCommand(robot.logger, name, format.display || format, description);
            command_factory.addCommand(command, name, format.display || format, alias,
                                       (format.display ? utils.DISPLAY : 0)
                                       | (format.regex_flags && format.regex_flags.includes('g') ? utils.G : 0));

            _.each(format.representation, function (representation) {
              var re;

              command = formatCommand(robot.logger, name, representation, description);
              command_factory.addCommand(command, name, representation, alias, utils.REPRESENTATION);

              re = command_factory.getRegexForFormatString(representation);
              // Convert the representation to a regex and add a listener for it
              // to run the command
              robot.hear(re, function(msg) {
                var command, result, results;

                // We use msg.message instead of msg.match[1] because we want
                // search through *all* possible matches, not just the match
                // that fired this
                command = formatter.normalizeCommand(msg.message.toString());
                result = command_factory.getMatchingCommand(command);

                if (result) {
                  robot.logger.debug("Executing command from: " + result);
                  /*
                   * command_name = result[0]
                   * format_string = result[1]
                   * command
                   * action_alias = result[2]
                   *
                   * We use the full command here because the regex should only
                   * match once.
                   */
                  executeCommand(msg, result[0], result[1], command, result[2]);

                  msg.finish();

                } else {
                  robot.logger.debug("No commands match '" + command + "', searching global commands");

                  results = command_factory.getMatchingCommands(command);
                  if (results) {
                    _.each(results, function (result) {
                      robot.logger.debug("Executing command from: " + result);
                      /*
                       * command_name = result[0]
                       * format_string = result[1]
                       * command = result[3]
                       * action_alias = result[2]
                       *
                       * We use result[3] here instead of the full command
                       * because we only want to send the part of the full
                       * command that matched the regex. This will change as
                       * we iterate through each match, and we dispatch each
                       * individual match to StackStorm.
                       */
                      executeCommand(msg, result[0], result[1], result[3], result[2]);
                    });

                    msg.finish();

                  } else {
                    robot.logger.debug("No commands matched '" + command + "'");
                    return;
                  }
                }
              });
            });
          });
        });

        robot.logger.info(command_factory.st2_hubot_commands.length + ' commands are loaded');
      })
      .catch(function (err) {
        var error_msg = 'Failed to retrieve commands from "%s": %s';
        robot.logger.error(util.format(error_msg, env.ST2_API, err.message));
      });
  };

  var sendAck = function (msg, res) {
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

  var createExecution = function (msg, payload) {
    robot.logger.debug('Sending command payload:', JSON.stringify(payload));

    api.aliasExecution.create(payload)
      .then(function (res) { sendAck(msg, res); })
      .catch(function (err) {
        // Compatibility with older StackStorm versions
        if (err.status === 200) {
          return sendAck(msg, { execution: { id: err.message } });
        }
        robot.logger.error('Failed to create an alias execution:', err);
        var addressee = utils.normalizeAddressee(msg, robot.adapterName);
        var message = util.format(_.sample(ERROR_MESSAGES), err.message);
        if (err.requestId) {
          message = util.format(
            message,
            util.format('; Use request ID %s to grep st2 api logs.', err.requestId));
        }
        postDataHandler.postData({
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

  var executeCommand = function(msg, command_name, format_string, command, action_alias) {
    var addressee = utils.normalizeAddressee(msg, robot.adapterName);
    var payload = {
      'name': command_name,
      'format': format_string.toString().replace(/\(\?</g, '(?P<'),
      'command': command,
      'user': addressee.name,
      'source_channel': addressee.room,
      'notification_route': env.ST2_ROUTE || 'hubot'
    };

    if (utils.enable2FA(action_alias)) {
      var twofactor_id = uuid.v4();
      robot.logger.debug('Requested an action that requires 2FA. Guid: ' + twofactor_id);
      msg.send(TWOFACTOR_MESSAGE);
      api.executions.create({
        'action': env.HUBOT_2FA,
        'parameters': {
          'uuid': twofactor_id,
          'user': addressee.name,
          'channel': addressee.room,
          'hint': action_alias.description
        }
      });
      twofactor[twofactor_id] = {
        'msg': msg,
        'payload': payload
      };
    } else {
      createExecution(msg, payload);
    }


  };

  robot.respond(/([\s\S]+?)$/i, function(msg) {
    var command, result, command_name, format_string, action_alias;

    // Normalize the command and remove special handling provided by the chat service.
    // e.g. slack replace quote marks with left double quote which would break behavior.
    command = formatter.normalizeCommand(msg.match[1]);

    result = command_factory.getMatchingCommand(command);

    if (!result) {
      // No command found
      return;
    }

    command_name = result[0];
    format_string = result[1];
    action_alias = result[2];

    executeCommand(msg, command_name, format_string, command, action_alias);
  });

  robot.router.post('/hubot/st2', function(req, res) {
    var data;

    try {
      if (req.body.payload) {
        data = JSON.parse(req.body.payload);
      } else {
        data = req.body;
      }
      // Special handler to try and figure out when a hipchat message
      // is a whisper:
      if (robot.adapterName === 'hipchat' && !data.whisper && data.channel.indexOf('@') > -1 ) {
        data.whisper = true;
        robot.logger.debug('Set whisper to true for hipchat message');
      }

      postDataHandler.postData(data);

      res.send('{"status": "completed", "msg": "Message posted successfully"}');
    } catch (e) {
      robot.logger.error("Unable to decode JSON: " + e);
      robot.logger.error(e.stack);
      res.send('{"status": "failed", "msg": "An error occurred trying to post the message: ' + e + '"}');
    }
  });

  var commands_load_interval;

  function start() {
    api.stream.listen().catch(function (err) {
      robot.logger.error('Unable to connect to stream:', err);
    }).then(function (source) {
      source.onerror = function (err) {
        // TODO: squeeze a little bit more info out of evensource.js
        robot.logger.error('Stream error:', err);
      };
      source.addEventListener('st2.announcement__chatops', function (e) {
        var data;

        robot.logger.debug('Chatops message received:', e.data);

        if (e.data) {
          data = JSON.parse(e.data).payload;
        } else {
          data = e.data;
        }

        // Special handler to try and figure out when a hipchat message
        // is a whisper:
        if (robot.adapterName === 'hipchat' && !data.whisper && data.channel.indexOf('@') > -1 ) {
          data.whisper = true;
          robot.logger.debug('Set whisper to true for hipchat message');
        }

        postDataHandler.postData(data);

      });

      if (env.HUBOT_2FA) {
        source.addEventListener('st2.announcement__2fa', function (e) {
          var data;

          robot.logger.debug('Successfull two-factor auth:', e.data);

          if (e.data) {
            data = JSON.parse(e.data).payload;
          } else {
            data = e.data;
          }

          var executionData = twofactor[data.uuid];
          createExecution(executionData.msg, executionData.payload);
          delete twofactor[data.uuid];

        });
      }

    });

    // Add an interval which tries to re-load the commands
    commands_load_interval = setInterval(loadCommands.bind(self), (env.ST2_COMMANDS_RELOAD_INTERVAL * 1000));

    // Initial command loading
    loadCommands();

    // Install SIGUSR2 handler which reloads the command
    install_sigusr2_handler();
  }

  function stop() {
    clearInterval(commands_load_interval);
    api.stream.listen().then(function (source) {
      source.removeAllListeners();
      source.close();
    });
  }

  function install_sigusr2_handler() {
    process.on('SIGUSR2', function() {
      loadCommands();
    });
  }

  // Authenticate with StackStorm backend and then call start.
  // On a failure to authenticate log the error but do not quit.
  return promise.then(function () {
    start();
    return stop;
  });
};
