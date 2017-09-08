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
var utils = require('./utils.js');
var XRegExp = require('xregexp');


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

  // Maps command format to a compiled regex for that format
  this.st2_commands_global_regex_map = {};
}

CommandFactory.prototype.getRegexForFormatString = function(format, flags) {
  var extra_params, regex, regex_str = format;

  // Note: We replace format parameters with ([\s\S]+?) and allow arbitrary
  // number of key=value pairs at the end of the string
  // Format parameters with default value {{param=value}} are allowed to
  // be skipped.
  // Note that we use "[\s\S]" instead of "." to allow multi-line values
  // and multi-line commands in general.

  // Optional multiple key=value pairs
  // ( attr_name="value"|'something'|({something})|something )*
  extra_params = '(\\s+(\\S+)\\s*=("([\\s\\S]*?)"|\'([\\s\\S]*?)\'|({[\\s\\S]*?})|(\\S+))\\s*)*';

  // From https://docs.stackstorm.com/chatops/aliases.html
  // Possible inputs:
  // Basic: "run {{cmd}} on {{hosts}}" -> /run (?<cmd>\S+) on (?<hosts>\S+)/
  // With default: "run {{cmd}} on {{hosts=localhost}}" -> /run (?<cmd>\S+) on (?<hosts>\S+)/
  // With JSON default: "run {{thing={'key': 'value'}}}" -> /run (?<thing>[^\s=]+).*?/
  // Regular expressions: "(run|execute) {{cmd}}( on {{hosts=localhost}})?[!.]?"
  // Key-value parameters: "run {{cmd}} on {{hosts}} {{key1}}={{value1}} {{key2}}={{value2}}"
  //
  // This function is intentionally written to be as stupid as possible. We
  // avoid attempting parsing regex strings with regexes, as down that path
  // lies madness.
  //
  // If you pass in a format string, we convert that to a regex for you, with
  // full named capture groups and everything.
  // But if you pass in a fully-formed regex, we completely leave that alone.
  // Write your aliases accordingly!

  if (regex_str.indexOf("{{") !== -1 && regex_str.indexOf("}}") !== -1) {
    // {{ option=default_value }} -> (([\s\S]+?))?  // Why wrap the whole thing in an optional group?
    regex_str = regex_str.replace(/(\s*){{\s*(\S+)\s*=\s*(?:({.+?}|.+?))\s*}}(\s*)/g, '\\s*($1(?<$2>[\\s\\S]+?)$4)?\\s*');

    // {{ option }} -> ([\s\S]+?)
    // Grab the whitespace on either side so regexes can specify whether or not the whitespace is optional
    // regex_str = regex_str.replace(/(\s*){{\s*([\w_]+).*?\s*}}(\s*)/g, '$1(?<$2>[\\s\\S]+?)$3');
    var parameter_re = new XRegExp('(?<before_ws>\\s*){{\\s*(?<var>[\\w_]+).*?\\s*}}(?<after_ws>\\s*)', 'g');
    regex_str = XRegExp.replace(regex_str, parameter_re, '${before_ws}(?<${var}>[\\s\\S]+?)${after_ws}');

    // Only anchor if we aren't anchored already
    if (regex_str.charAt(0) !== '^') {
      regex_str = '^\s*' + regex_str;
    }

    // Only allow extra params if we aren't anchored
    if (regex_str.charAt(regex_str.length-1) !== '$') {
      regex_str = regex_str + extra_params + '\\s*$';
    }
  }

  // Pass the flags in, guaranteeing that they include an 'i'
  return new XRegExp(regex_str, flags ? (flags.includes('i') ? flags : flags + 'i') : 'i');
};

CommandFactory.prototype.addCommand = function(command, name, format, action_alias, flag) {
  var compiled_template, context, command_string, regex,
      representation = (!flag || (flag & utils.REPRESENTATION)),
      display = (!flag || (flag & utils.DISPLAY)),
      _global = (!!flag && (flag & utils.G));  /* regex global flag */

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

  if (representation) {
    this.st2_hubot_commands.push(command_string);
    this.st2_commands_name_map[name] = action_alias;
    this.st2_commands_format_map[format] = action_alias;
    regex = this.getRegexForFormatString(format, (flag & utils.G) ? 'g' : '');

    if (_global) {
      this.st2_commands_global_regex_map[format] = regex;
    } else {
      this.st2_commands_regex_map[format] = regex;
    }
  }
  if (display && this.robot.commands.indexOf(command_string) === -1) {
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
  this.st2_commands_global_regex_map = {};
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

CommandFactory.prototype.getMatchingCommands = function(command) {
  if (RegExp.prototype.flags === undefined) {
    Object.defineProperty(RegExp.prototype, 'flags', {
      configurable: true,
      get: function() {
        return this.toString().match(/[gimuy]*$/)[0];
      }
    });
  }

  var result, common_prefix, command_name, command_arguments, format_strings,
      i, m, format_string, regex, action_alias,
      rtn_list = [];

  // 1. Try to use regex search - this works for commands with a format string
  format_strings = Object.keys(this.st2_commands_global_regex_map);

  for (i = 0; i < format_strings.length; i++) {
    format_string = format_strings[i];
    regex = this.st2_commands_global_regex_map[format_string];

    while ((m = regex.exec(command)) !== null) {
      action_alias = this.st2_commands_format_map[format_string];
      command_name = action_alias.name;

      rtn_list.push([command_name, format_string, action_alias, m[0]]);
    }

    if (rtn_list.length > 0) {
      return rtn_list;
    }
  }

  return null;
};

module.exports = CommandFactory;
