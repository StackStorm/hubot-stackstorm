/*
 Licensed to the StackStorm, Inc ('StackStorm') under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
limitations under the License.
*/

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
  st2client = require('st2client')
  ;

// Setup the Environment
env.ST2_API = env.ST2_API || 'http://localhost:9101';
env.ST2_ROUTE = env.ST2_ROUTE || null;
env.ST2_WEBUI_URL = env.ST2_WEBUI_URL || null;

// Optional authentication info
env.ST2_AUTH_USERNAME = env.ST2_AUTH_USERNAME || null;
env.ST2_AUTH_PASSWORD = env.ST2_AUTH_PASSWORD || null;

// Optional authentication token
env.ST2_API_KEY = env.ST2_API_KEY || null;

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
    "Want me to take that off your hand? You got it! Don't forget your execution ID: %s"
];


module.exports = function(robot) {
  slack_monkey_patch.patchSendMessage(robot);

  var self = this;

  var promise = Promise.resolve();

  var url = utils.parseUrl(env.ST2_API);

  var opts = {
    protocol: url.protocol,
    host: url.host,
    port: url.port,
    rejectUnauthorized: false
  };

  var api = st2client(opts);

  if (env.ST2_API_KEY) {
    api.setKey({ key: env.ST2_API_KEY });
  }

  if (env.ST2_AUTH_TOKEN) {
    api.setToken({ token: env.ST2_AUTH_TOKEN });
  }

  if (env.ST2_AUTH_URL) {
    if (env.ST2_AUTH_USERNAME && env.ST2_AUTH_PASSWORD) {
      promise = st2client({
        auth: utils.parseUrl(env.ST2_AUTH_URL)
      }).authenticate(env.ST2_AUTH_USERNAME, env.ST2_AUTH_PASSWORD)
        .then(function (token) {
          api.setToken(token);
        })
        .catch(function (err) {
          robot.logger.error('Failed to authenticate: ' + err.message);

          throw err;
        });
    } else {
      throw new Error('Both ST2_AUTH_USERNAME and ST2_AUTH_PASSWORD env variables are required when ST2_AUTH_URL is set.');
    }
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
        robot.logger.info(aliases.length + ' commands are loaded');

        // Remove all the existing commands
        command_factory.removeCommands();

        _.each(aliases, function (alias) {
          var name = alias.name;
          var formats = alias.formats;
          var description = alias.description;

          if (!formats || formats.length === 0) {
            robot.logger.error('No formats specified for command: ' + name);
            return;
          }

          _.each(formats, function (format) {
            var command = formatCommand(robot.logger, name, format.display || format, description);
            command_factory.addCommand(command, name, format.display || format, alias);

            _.each(format.representation, function (representation) {
              command = formatCommand(robot.logger, name, representation, description);
              command_factory.addCommand(command, name, representation, alias, true);
            });
          });
        });
      })
      .catch(function (err) {
        var error_msg = 'Failed to retrieve commands from "%s": %s';
        robot.logger.error(util.format(error_msg, env.ST2_API, err.message));
      });
  };

  var executeCommand = function(msg, command_name, format_string, command, action_alias) {
    var payload = {
      'name': command_name,
      'format': format_string,
      'command': command,
      'user': msg.message.user.name,
      'source_channel': msg.message.room,
      'notification_route': env.ST2_ROUTE || 'hubot'
    };

    robot.logger.debug('Sending command payload %s ' + JSON.stringify(payload));

    api.aliasExecution.create(payload)
      .catch(function (err) {
        // Until aliasexecution endpoint didn't get patched with proper status and output, work
        // around this curious design decision.
        if (err.status === 200) {
          return { id: err.message };
        }

        throw err;
      })
      .then(function (execution) {
        if (action_alias.ack && action_alias.ack.enabled === false) {
          return;
        }

        if (action_alias.ack && action_alias.ack.format) {
          return action_alias.ack.format;
        }

        var history_url = utils.getExecutionHistoryUrl(execution.id);

        var message = util.format(_.sample(START_MESSAGES), execution.id);

        if (history_url) {
          message += util.format(' (details available at %s)', history_url);
        }

        return message;
      })
      .then(function (message) {
        if (message) {
          msg.send(message);
        }
      })
      .catch(function (err) {
        msg.send(util.format('error : %s', err.message));
      });
  };

  robot.respond(/([\s\S]+?)$/i, function(msg) {
    var command, result, command_name, format_string, action_alias;

    // Normalize the command and remove special handling provided by the chat service.
    // e.g. slack replace quote marks with left double quote which would break behavior.
    command = formatter.normalizeCommand(msg.match[1]);

    // Use the lower-case version only for lookup. Other preserve the case so that
    // user provided case is preserved.
    result = command_factory.getMatchingCommand(command.toLowerCase());

    if (!result) {
      // No command found
      return;
    }

    command_name = result[0];
    format_string = result[1];
    action_alias = result[2];

    executeCommand(msg, command_name, format_string, command, action_alias);
  });

  api.stream.listen().then(function (source) {
    source.addEventListener('st2.announcement__chatops', function (e) {
      var data;

      if (e.data) {
        data = JSON.parse(e.data).payload;
      } else {
        data = e.data;
      }

      postDataHandler.postData(data);
    });
  });

  robot.router.post('/hubot/st2', function(req, res) {
    var data;

    try {
      if (req.body.payload) {
        data = JSON.parse(req.body.payload);
      } else {
        data = req.body;
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
