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
var DefaultAdapter = require('./default');


function MSTeamsAdapter(robot) {
  var self = this;
  DefaultAdapter.call(self, robot);
}

util.inherits(MSTeamsAdapter, DefaultAdapter);

MSTeamsAdapter.prototype.postData = function(data) {
  var self = this;
  var messages_to_send,
      // We capture robot here so the `sendMessage` closure captures the
      // correct `this`
      robot = self.robot,
      split_message = utils.splitMessage(data.message);

  if (data.extra && data.extra.botframework) {
    robot.logger.warning(util.format('The extra.botframework attribute of aliases is not used yet.'));
  }

  if (split_message.pretext) {
    var text = self.formatData(split_message.text);
    messages_to_send = [split_message.pretext, text];
  } else {
    messages_to_send = [self.formatData(data.message)];
  }

  // We define a recursive closure that calls itself with the next data to send
  // after a timeout. This approximates sending synchronous (sequential) HTTP
  // requests.
  var sendMessage = function (i) {
    robot.adapter.send(data.context, messages_to_send[i]);

    if (messages_to_send.length > ++i) {
      setTimeout(function () { sendMessage(i); }, 300);
    }
  };

  sendMessage(0);

  return;
}

MSTeamsAdapter.prototype.formatData = function(data) {
  var self = this;

  self.robot.logger.debug("Got data in formatData: " + JSON.stringify(data));

  // Remove starting newlines
  data = data.replace(/^\n/g, '');
  // Replace single newlines with double newlines
  data = data.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");

  return data;
};

MSTeamsAdapter.prototype.formatRecipient = function(recipient) {
  var self = this;

  self.robot.logger.debug("Got recipient in formatRecipient: " + JSON.stringify(recipient));
  return recipient;
};

MSTeamsAdapter.prototype.normalizeCommand = function (command) {
  var self = this;

  self.robot.logger.debug("Got command in normalizeCommand: " + JSON.stringify(command));
  return command;
}

MSTeamsAdapter.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

module.exports = MSTeamsAdapter;
