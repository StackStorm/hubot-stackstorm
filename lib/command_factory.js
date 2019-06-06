// Copyright 2019 Extreme Networks, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var _ = require('lodash');
var utils = require('./utils.js');


/**
 * Manage command for stackstorm, storing them in robot and providing
 * lookups given command literals.
 */
function CommandFactory(robot) {
  this.robot = robot;

  // Stores a list of hubot command strings
  this.st2_hubot_commands = [];

  // Maps command name (pk) to the action alias object
  this.st2_commands_name_map = {};

  // Maps command format to the action alias object
  this.st2_commands_format_map = {};

  // Maps command format to a compiled regex for that format
  this.st2_commands_regex_map = {};
}

CommandFactory.prototype.getRegexForFormatString = function(format) {
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
  regex = new RegExp('^\\s*' + regex_str + extra_params + '\\s*$', 'i');
  return regex;
};

CommandFactory.prototype.addCommand = function(command, name, format, action_alias, flag) {
  var compiled_template, context, command_string, regex;

  if (!format) {
    this.robot.logger.error('Skipped empty command.');
    return;
  }

  context = {
    robotName: this.robot.name,
    command: command
  };

  compiled_template = _.template('hubot ${command}');
  command_string = compiled_template(context);

  if (!flag || flag === utils.REPRESENTATION) {
    this.st2_hubot_commands.push(command_string);
    this.st2_commands_name_map[name] = action_alias;
    this.st2_commands_format_map[format] = action_alias;
    regex = this.getRegexForFormatString(format);
    this.st2_commands_regex_map[format] = regex;
  }
  if ((!flag || flag === utils.DISPLAY) && this.robot.commands.indexOf(command_string) === -1) {
    this.robot.commands.push(command_string);
  }

  this.robot.logger.debug('Added command: ' + command);
};

CommandFactory.prototype.removeCommands = function() {
  var i, command, array_index;

  for (i = 0; i < this.st2_hubot_commands.length; i++) {
    command = this.st2_hubot_commands[i];
    array_index = this.robot.commands.indexOf(command);

    if (array_index !== -1) {
      this.robot.commands.splice(array_index, 1);
    }
  }

  this.st2_hubot_commands = [];
  this.st2_commands_name_map = {};
  this.st2_commands_format_map = {};
  this.st2_commands_regex_map = {};
};

CommandFactory.prototype.getMatchingCommand = function(command) {
  var result, common_prefix, command_name, command_arguments, format_strings,
      i, format_string, regex, action_alias;

  // 1. Try to use regex search - this works for commands with a format string
  format_strings = Object.keys(this.st2_commands_regex_map);

  for (i = 0; i < format_strings.length; i++) {
    format_string = format_strings[i];
    regex = this.st2_commands_regex_map[format_string];
    if (regex.test(command)) {
      action_alias = this.st2_commands_format_map[format_string];
      command_name = action_alias.name;

      return [command_name, format_string, action_alias];
    }
  }

  return null;
};

module.exports = CommandFactory;
