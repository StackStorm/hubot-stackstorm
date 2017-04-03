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

"use strict";

var _ = require('lodash');
var env = process.env;
var utils = require('./utils.js');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var formatHelpCommand = function(name, format, description) {
  var context, template_str, compiled_template, command;

  if (!format) {
    throw (Error('format should be non-empty.'));
  }

  context = {
    'format': format,
    'description': description
  };

  template_str = 'hubot ${format} - ${description}';
  compiled_template = _.template(template_str);
  command = compiled_template(context);

  return command;
};

var getRegexForFormatString = function (format) {
  var extra_params, regex_str, regex;

  // Note: We replace format parameters with ([\s\S]+?) and allow arbitrary
  // number of key=value pairs at the end of the string
  // Format parameters with default value {{param=value}} are allowed to
  // be skipped.
  // Note that we use "[\s\S]" instead of "." to allow multi-line values
  // and multi-line commands in general.
  extra_params = '(\\s+(\\S+)\\s*=("([\\s\\S]*?)"|\'([\\s\\S]*?)\'|({[\\s\\S]*?})|(\\S+))\\s*)*';
  regex_str = format.replace(/(\s*){{\s*\S+\s*=\s*(?:({.+?}|.+?))\s*}}(\s*)/g, '\\s*($1([\\s\\S]+?)$3)?\\s*');
  regex_str = regex_str.replace(/\s*{{.+?}}\s*/g, '\\s*([\\s\\S]+?)\\s*');
  regex = new RegExp('^\\' + env.HUBOT_ALIAS + '\\s*' + regex_str + extra_params + '\\s*$', 'i');
  return regex;
};

function CommandFactory(robot) {
  var self = this;
  self.robot = robot;
  EventEmitter.call(this);
}

util.inherits(CommandFactory, EventEmitter);

// TODO: decouple messaging_handler from command factory
CommandFactory.prototype.addCommand = function (action_alias, messaging_handler) {
  var self = this;

  if (action_alias.enabled === false) {
    return;
  }

  if (!action_alias.formats || action_alias.formats.length === 0) {
    self.robot.logger.error('No formats specified for command: ' + action_alias.name);
    return;
  }

  var regexes = [];
  var commands_regex_map = {};
  var action_alias_name = action_alias.name;

  _.each(action_alias.formats, function (format) {
    if (typeof format === 'string') {
      self.robot.commands.push(formatHelpCommand(action_alias.name, format, action_alias.description));
      commands_regex_map[format] = getRegexForFormatString(format);
    } else {
      if (format.display) {
        self.robot.commands.push(formatHelpCommand(action_alias.name, format.display, action_alias.description));
      }
      _.each(format.representation, function (representation) {
        commands_regex_map[representation] = getRegexForFormatString(representation);
      });
    }
  });

  var format_strings = Object.keys(commands_regex_map);

  var listener_opts = {
    source: 'st2',
    id: 'st2.' + action_alias_name
  }

  if (action_alias.extra && action_alias.extra.hubot_auth) {
    listener_opts.auth = 'true';
    listener_opts.roles = action_alias.extra.hubot_auth.roles;
    listener_opts.rooms = action_alias.extra.hubot_auth.rooms;
    if (action_alias.extra.hubot_auth.env) {
      listener_opts.env = action_alias.extra.hubot_auth.env
    }
  }

  self.robot.listen(function (msg) {
    var i, format_string, regex;
    if (!msg.text) {
      return false;
    }
    var command = messaging_handler.normalizeCommand(msg.text);
    for (i = 0; i < format_strings.length; i++) {
      format_string = format_strings[i];
      regex = commands_regex_map[format_string];
      if (regex.test(msg.text)) {
        msg['st2_command_format_string'] = format_string;
        msg['normalized_command'] = command;
        return true;
      }
    }
    return false;
  }, listener_opts, function (msg) {
    self.emit('st2.command_match', {
      msg: msg,
      alias_name: action_alias_name,
      command_format_string: msg.message['st2_command_format_string'],
      command: msg.message['normalized_command'],
      addressee: messaging_handler.normalizeAddressee(msg)
    });
  });
};

module.exports = CommandFactory;
