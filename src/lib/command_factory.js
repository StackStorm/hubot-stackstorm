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
var formatCommand = require('./format_command.js');
var CommandExecutor = require('./command_executor');


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
  regex = new RegExp('^\\s*' + regex_str + extra_params + '\\s*$', 'i');
  return regex;
};

function CommandFactory(robot) {
  this.robot = robot;
  this.st2_action_aliases = [];
}

CommandFactory.prototype.addCommand = function (action_alias, formatter) {
  if (action_alias.enabled === false) {
    return;
  }

  if (!action_alias.formats || action_alias.formats.length === 0) {
    this.robot.logger.error('No formats specified for command: ' + action_alias.name);
    return;
  }

  var regexes = [];

  _.each(action_alias.formats, function (format) {
    action_alias.formatted_command = formatCommand(action_alias.name, format.display || format, action_alias.description);

    var context = {
      robotName: this.robot.name,
      command: action_alias.formatted_command
    };

    var compiled_template = _.template('hubot ${command}');
    action_alias.command_string = compiled_template(context);

    this.robot.commands.push(action_alias.formatted_command);
    if (format.display) {
      _.each(format.representation, function (representation) {
        regexes.push(getRegexForFormatString(representation));
      });
    } else {
      regexes.push(getRegexForFormatString(format));
    }
  });

  action_alias.regexes = regexes;
  this.st2_action_aliases.push(action_alias);

  this.robot.listen(function (msg) {
    var command = formatter.normalizeCommand(msg.text);
    _.each(regexes, function (regex) {
      if (regex.test(command)) {
        return true;
      }
    });
    return false;
  }, { id: action_alias.name }, function (msg) {
    executeCommand(msg, command_name, format_string, command, addressee);
  });
};

module.exports = CommandFactory;
