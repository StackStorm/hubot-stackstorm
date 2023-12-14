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

var env = process.env;
var util = require('util');
var utils = require('./../utils');
var truncate = require('truncate');


function DefaultAdapter(robot) {
  console.log("DefaultAdapter");
  var self = this;
  console.log("DefaultAdapter 1");
  self.robot = robot;
  console.log("DefaultAdapter 2");
  // Limit the size of a message.
  self.truncate_length = env.ST2_MAX_MESSAGE_LENGTH;
  console.log("DefaultAdapter 3");
};

DefaultAdapter.prototype.postData = function(data) {
  console.log("DefaultAdapter.postData");
  var self = this;
  var recipient, split_message, formatted_message,
      text = "";

  if (data.whisper && data.user) {
    recipient = data.user;
  } else {
    recipient = data.channel;
    text = (data.user && !data.whisper) ? util.format('%s: ', data.user) : "";
  }

  recipient = self.formatRecipient(recipient);
  text += self.formatData(data.message);

  // Ignore the delimiter in the default formatter and just concat parts.
  split_message = utils.splitMessage(text);
  if (split_message.pretext && split_message.text) {
    formatted_message = util.format("%s\n%s", split_message.pretext, split_message.text);
  } else {
    formatted_message = split_message.pretext || split_message.text;
  }

  self.robot.messageRoom.call(self.robot, recipient, formatted_message);
};

DefaultAdapter.prototype.formatData = function(data) {
  console.log("DefaultAdapter.formData");
  var self = this;

  if (utils.isNull(data)) {
    return "";
  }
  if (self.truncate_length > 0) {
    // The ellipsis argument is only to preserve backwards compatibility, as the
    // truncate function switched from using '...' (three period characters
    // forming and ellipsis) in truncate 1.x to '…' (a single Unicode ellipsis
    // character) in truncate 2+.
    // Switching to using the new default ellipsis ('…') probably won't break
    // anything.
    data = truncate(data, self.truncate_length, {ellipsis: '...'});
  }
  return data;
};

DefaultAdapter.prototype.formatRecipient = function(recipient) {
  console.log("DefaultAdapter.formRecipient");
  return recipient;
};

DefaultAdapter.prototype.normalizeCommand = function(command) {
  console.log("DefaultAdapter.normalizeCommand");
  return command;
};

DefaultAdapter.prototype.normalizeAddressee = function(msg) {
  console.log("DefaultAdapter.normalizeAddressee");
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

module.exports = DefaultAdapter;
