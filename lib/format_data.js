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

var _ = require('lodash'),
  truncate = require('truncate'),
  util = require('util'),
  utils = require('./utils.js');

var env = process.env;

/*
  SlackFormatter.
*/
function SlackFormatter(robot) {
  this.robot = robot;
}

SlackFormatter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // For slack we do not truncate or format the result. This is because
  // data is posted to slack as a message attachment.
  return data;
};

SlackFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
};

SlackFormatter.prototype.normalizeCommand = function(command) {
  // replace left double quote with regular quote
  command = command.replace(/\u201c/g, '\u0022');
  // replace right double quote with regular quote
  command = command.replace(/\u201d/g, '\u0022');
  // replace left single quote with regular apostrophe
  command = command.replace(/\u2018/g, '\u0027');
  // replace right single quote with regular apostrophe
  command = command.replace(/\u2019/g, '\u0027');
  return command;
};

/*
  HipChatFormatter.
*/
function HipChatFormatter(robot) {
  this.robot = robot;
}

HipChatFormatter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // HipChat has "show more" capability in messages so no truncation.
  return '/code ' + data;
};

HipChatFormatter.prototype.formatRecepient = function(recepient) {
  var robot_name = env.HUBOT_HIPCHAT_JID.split("_")[0];
  // harcode for now. This most likely requires some investiagtion.
  var hipchat_domain = 'conf.hipchat.com';
  return util.format('%s_%s@%s', robot_name, recepient, hipchat_domain);
};

HipChatFormatter.prototype.normalizeCommand = function(command) {
  return command;
};

/*
  DefaultFormatter.
*/
function DefaultFormatter(robot) {
  this.robot = robot;

  // Limit the size of a message.
  this.truncate_length = env.ST2_MAX_MESSAGE_LENGTH;
}

DefaultFormatter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  if (this.truncate_length > 0) {
    data = truncate(data, this.truncate_length);
  }
  return data;
};

DefaultFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
};

DefaultFormatter.prototype.normalizeCommand = function(command) {
  return command;
};

var formatters = {
  'slack': SlackFormatter,
  'hipchat': HipChatFormatter,
  'default': DefaultFormatter
};

module.exports.getFormatter = function(adapterName, robot) {
  if (!(adapterName in formatters)) {
    robot.logger.warning(
      util.format('No supported formatter found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  return new formatters[adapterName](robot);
};
