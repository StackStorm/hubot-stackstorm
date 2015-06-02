// Description:
//   StackStorm hubot integration
//
// Dependencies:
//
//
// Configuration:
//   ST2_API - FQDN + port to StackStorm endpoint
//   ST2_CHANNEL - StackStorm channel name used for notification
//   ST2_COMMANDS_RELOAD_INTERVAL - Reload interval for commands
//
// Notes:
//   Command list is automatically generated from StackStorm ChatOps metadata
//

/*jslint node: true */
"use strict";

var url = require('url');

var _ = require('lodash'),
    util = require('util'),
    env = process.env,
    formatCommand = require('./format_command.js'),
    formatData = require('./format_data.js');

var st2client = require('st2client');

// Setup the Environment
env.ST2_API = env.ST2_API || 'http://localhost:9101';
env.ST2_CHANNEL = env.ST2_CHANNEL || 'hubot';

// Optional authentication info
env.ST2_AUTH_USERNAME = env.ST2_AUTH_USERNAME || null;
env.ST2_AUTH_PASSWORD = env.ST2_AUTH_PASSWORD || null;

// Optional, if not provided, we infer it from the API URL
env.ST2_AUTH_URL = env.ST2_AUTH_URL || null;

// Command reload interval in seconds
env.ST2_COMMANDS_RELOAD_INTERVAL = env.ST2_COMMANDS_RELOAD_INTERVAL || 120;
env.ST2_COMMANDS_RELOAD_INTERVAL = parseInt(env.ST2_COMMANDS_RELOAD_INTERVAL, 10);

function isNotNull(value) {
  return (!value) || value === 'null';
}

module.exports = function(robot) {
  var self = this;

  // Stores a list of hubot command strings
  var st2_hubot_commands = [];

  // Maps command name (pk) to the action alias object
  var st2_commands_name_map = {};

  // Maps command format to the action alias object
  var st2_commands_format_map = {};

  // Maps command format to a compiled regex for that format
  var st2_commands_regex_map = {};

  // Auth token we use to authenticate
  var auth_token = null;

  var client = robot.http(env.ST2_API);

  /**
   * Function which removes all the StackStorm hubot command and resets all the internal state.
   */
  var removeCommands = function() {
    var i, command, array_index;

    for (i = 0; i < st2_hubot_commands.length; i++) {
      command = st2_hubot_commands[i];
      array_index = robot.commands.indexOf(command);

      if (array_index !== -1) {
        robot.commands.splice(array_index, 1);
      }
    }

    st2_hubot_commands = [];
    st2_commands_name_map = {};
    st2_commands_format_map = {};
    st2_commands_regex_map = {};
  };

  var loadCommands = function() {
    var request;

    robot.logger.info('Loading commands....');

    // TODO: We should use st2client for this
    request = client.scope('/exp/actionalias');

    if (auth_token) {
      request = request.header('X-Auth-Token', auth_token);
    }

    request.get() (
      function(err, resp, body) {
        var parsed_body, success;

        parsed_body = JSON.parse(body);
        if (!_.isArray(parsed_body)) {
          success = false;
        }
        else {
          success = true;
        }

        if (!success) {
          robot.logger.error('Failed to retrieve commands: ' + body);
          return;
        }

        // Remove all the existing commands
        removeCommands();

        _.each(parsed_body, function(action_alias) {
          var name, formats, description, i, format, command;

          if (!action_alias) {
            robot.logger.error('No action alias specified for command: ' + name);
            return;
          }

          name = action_alias.name;
          formats = action_alias.formats;
          description = action_alias.description;

          if (!formats || formats.length === 0) {
            robot.logger.error('No formats specified for command: ' + name);
            return;
          }

          for (i = 0; i < formats.length; i++) {
            format = formats[i];
            command = formatCommand(robot.logger, name, format, description);

            addCommand(command, name, format, action_alias);
          }
        });
      }
    );
  };

  /**
   * Return matching command name and format for the provided command string.
   */
  var getMatchingCommand = function(command) {
    var result, common_prefix, command_name, command_arguments, format_strings, i, format_string, regex;

    // 1. Try to use regex search - this works for commands with a format string
    format_strings = Object.keys(st2_commands_regex_map);

    for (i = 0; i < format_strings.length; i++) {
      format_string = format_strings[i];
      regex = st2_commands_regex_map[format_string];

      if (regex.test(command)) {
        command_name = st2_commands_format_map[format_string].name;
        return [command_name, format_string];
      }
    }

    return null;
  };

  var getRegexForFormatString = function(format) {
    var regex_str, regex;

    // Note: We replace format parameters with (.+?) and allow arbitrary
    // number of key=value pairs at the end of the string
    regex_str = format.replace(/{{.+?}}/g, '(.+?)');
    regex = new RegExp(regex_str + '(\\s+)?(\\s?(\\w+)=(\\w+)){0,}' + '$');

    return regex;
  };

  var addCommand = function(command, name, format, action_alias) {
    var compiled_template, context, command_string, regex;

    if (!format) {
      robot.logger.error('Skipped empty command.');
      return;
    }

    context = {
      robotName: robot.name,
      command: command
    };

    compiled_template = _.template('${robotName} ${command}');
    command_string = compiled_template(context);
    regex = getRegexForFormatString(format);

    robot.commands.push(command_string);

    st2_hubot_commands.push(command_string);
    st2_commands_name_map[name] = action_alias;
    st2_commands_format_map[format] = action_alias;
    st2_commands_regex_map[format] = regex;

    robot.logger.debug('Added command: ' + command);
  };

  var executeCommand = function(msg, command_name, format_string, command) {
    var payload = {
      'name': command_name,
      'format': format_string,
      'command': command,
      'user': msg.message.user.name,
      'source_channel': msg.message.room,
      'notification_channel': env.ST2_CHANNEL
    };

    robot.logger.debug('Sending command payload %s ' + JSON.stringify(payload));

    client.scope('/exp/aliasexecution').post(JSON.stringify(payload))(
      function(err, resp, body) {
        if (err) {
          msg.send(util.format('error : %s', err));
        } else if (resp.statusCode !== 200) {
          msg.send(util.format('status code "%s": %s', resp.statusCode, body));
        } else {
          msg.send(util.format('Action execution with id %s started.', body));
        }
      }
    );
  };

  robot.respond(/(.+?)$/i, function(msg) {
    var command, result, command_name, format_string;

    command = msg.match[1].toLowerCase();
    result = getMatchingCommand(command);

    if (!result) {
      // No command found
      return;
    }

    command_name = result[0];
    format_string = result[1];

    executeCommand(msg, command_name, format_string, command);
  });

  robot.router.post('/hubot/st2', function(req, res) {
    var data, message, channel, recipient;

    try {
      if (req.body.payload) {
        data = JSON.parse(req.body.payload);
      } else {
        data = req.body;
      }
      message = formatData(data.message, '', robot.logger);

      // PM user, notify user, or tell channel
      if (data.user) {
        if (data.whisper === true) {
          recipient = data.user;
        } else {
          recipient = data.channel;
          message = util.format('%s :\n%s', data.user, message);
        }
      } else {
        recipient = data.channel;
      }

      robot.messageRoom(recipient, message);
      res.send('{"status": "completed", "msg": "Message posted successfully"}');
    } catch (e) {
      robot.logger.error("Unable to decode JSON: " + e);
      res.send('{"status": "failed", "msg": "An error occurred trying to post the message: ' + e + '"}');
    }
  });

  function start() {
    // Add an interval which tries to re-load the commands
    var commands_load_interval = setInterval(loadCommands.bind(self), (env.ST2_COMMANDS_RELOAD_INTERVAL * 1000));

    // Initial command loading
    loadCommands();
  }

  // TODO: Use async.js or similar or organize this better
  if (!isNotNull(env.ST2_AUTH_USERNAME) && !isNotNull(env.ST2_AUTH_PASSWORD)) {
    var credentials, config, st2_client, parsed;

    credentials = {
      'user': env.ST2_AUTH_USERNAME,
      'password': env.ST2_AUTH_PASSWORD
    };
    config = {
      'rejectUnauthorized': false,
      'credentials': credentials
    };

    if (!isNotNull(env.ST2_AUTH_URL)) {
      parsed = url.parse(env.ST2_AUTH_URL);

      config['auth'] = {};
      config['auth']['host'] = parsed['hostname'];
      config['auth']['port'] = parsed['port'];
      config['auth']['protocol'] = parsed['protocol'].substring(0, (parsed['protocol'].length - 1));
    }
    else {
      parsed = url.parse(env.ST2_API);

      config['host'] = parsed['hostname'];
      config['port'] = parsed['port'];
      config['protocol'] = parsed['protocol'].substring(0, (parsed['protocol'].length - 1));
    }

    st2_client = st2client(config);
    robot.logger.info('Performing authentication...');
    st2_client.authenticate(config.credentials.user, config.credentials.password).then(function(result) {
      robot.logger.debug('Successfully authenticated.');
      auth_token = result['token'];

      start();
    }).catch(function(err) {
      robot.logger.error('Failed to authenticate: ' + err.message.toString());
      process.exit(2);
    });
  }
  else {
    start();
  }
};
