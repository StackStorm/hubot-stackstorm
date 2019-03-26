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

SlackFormatter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

/*
  MattermostFormatter.
*/
function MattermostFormatter(robot) {
    this.robot = robot;
}

MattermostFormatter.prototype.formatData = function(data) {
    if (utils.isNull(data)) {
        return "";
    }
    // For slack we do not truncate or format the result. This is because
    // data is posted to slack as a message attachment.
    return data;
};

MattermostFormatter.prototype.formatRecepient = function(recepient) {
    return recepient;
};

MattermostFormatter.prototype.normalizeCommand = function(command) {
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

MattermostFormatter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
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
  var hipchat_domain = (env.HUBOT_HIPCHAT_XMPP_DOMAIN === 'btf.hipchat.com') ?
                       'conf.btf.hipchat.com' : 'conf.hipchat.com';
  return util.format('%s_%s@%s', robot_name, recepient, hipchat_domain);
};

HipChatFormatter.prototype.normalizeCommand = function(command) {
  return command;
};

HipChatFormatter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.mention_name,
    room: msg.message.user.jid
  };
};

/*
  RocketChatFormatter.
*/
function RocketChatFormatter(robot) {
  this.robot = robot;
}

RocketChatFormatter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // For Rocket we do not truncate or format the result. This is because
  // data is posted to RocketChat as a message attachment.
  return data;
};

RocketChatFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
};

RocketChatFormatter.prototype.normalizeCommand = function(command) {
  return command;
};

RocketChatFormatter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

/*
  SparkFormatter.
*/
function SparkFormatter(robot) {
  this.robot = robot;

  // Limit the size of a message.
  this.truncate_length = env.ST2_MAX_MESSAGE_LENGTH;
}

SparkFormatter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  if (this.truncate_length > 0) {
    // The ellipsis argument is only to preserve backwards compatibility, as the
    // truncate function switched from using '...' (three period characters
    // forming and ellipsis) in truncate 1.x to '…' (a single Unicode ellipsis
    // character) in truncate 2+.
    // Switching to using the new default ellipsis ('…') probably won't break
    // anything.
    data = truncate(data, this.truncate_length, {ellipsis: '...'});
  }
  return data;
};

SparkFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
};

SparkFormatter.prototype.normalizeCommand = function(command) {
  return command;
};

SparkFormatter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.user.room
  };
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
    // The ellipsis argument is only to preserve backwards compatibility, as the
    // truncate function switched from using '...' (three period characters
    // forming and ellipsis) in truncate 1.x to '…' (a single Unicode ellipsis
    // character) in truncate 2+.
    // Switching to using the new default ellipsis ('…') probably won't break
    // anything.
    data = truncate(data, this.truncate_length, {ellipsis: '...'});
  }
  return data;
};

DefaultFormatter.prototype.formatRecepient = function(recepient) {
  return recepient;
};

DefaultFormatter.prototype.normalizeCommand = function(command) {
  return command;
};

DefaultFormatter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

var formatters = {
  'slack': SlackFormatter,
  'matteruser': MattermostFormatter,
  'mattermost': MattermostFormatter,
  'hipchat': HipChatFormatter,
  'spark': SparkFormatter,
  'rocketchat': RocketChatFormatter,
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
