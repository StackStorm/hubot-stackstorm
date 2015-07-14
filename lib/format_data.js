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
  return util.format('```\n%s\n```', data);
};

SlackFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
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
  return data;
};

HipChatFormatter.prototype.formatRecepient = function(recepient) {
  var robot_name = env.HUBOT_HIPCHAT_JID.split("_")[0];
  var hipchat_domain = env.HUBOT_HIPCHAT_JID.split("@")[1];
  return util.format('%s_%s@%s', robot_name, recepient, hipchat_domain)
};

/*
  DefaultFormatter.
*/
function DefaultFormatter(robot) {
  this.robot = robot;
}

DefaultFormatter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  return data;
};

DefaultFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
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
