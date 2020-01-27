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
var SlackLikeAdapter = require('./slack-like');


function SparkAdapter(robot) {
  var self = this;
  SlackLikeAdapter.call(self, robot);
}

util.inherits(SparkAdapter, SlackLikeAdapter);

SparkAdapter.prototype.postData = function (data) {
  var self = this;
  self.robot.logger.debug("Data is: ", data);

  var recipient, split_message, formatted_message,
    text = "";
  var envelope;

  if (data.whisper && data.user) {
    recipient = data.user;
    envelope = {
      "user": data.user
    };
  } else {
    recipient = {
      "channel": data.channel
    };
    envelope = {
      "name": data.user,
      "id": data.channel,
      "room": data.channel,
    };
    text = (data.user && !data.whisper) ? util.format('%s: ', data.user) : "";
  }

  recipient = self.formatRecipient(recipient);
  // TODO: Pull attributes from data.extra.spark before pulling them from data.extra
  recipient.extra = data.extra;
  text += self.formatData(data.message);

  // Ignore the delimiter in the default formatter and just concat parts.
  split_message = utils.splitMessage(text);
  if (split_message.pretext && split_message.text) {
    formatted_message = util.format("%s\n%s", split_message.pretext, split_message.text);
  } else {
    formatted_message = split_message.pretext || split_message.text;
  }

  self.robot.messageRoom.call(self.robot, envelope, formatted_message);
};

// Override this with the original function from DefaultAdapter
// We do want this one to truncate
SparkAdapter.prototype.formatData = function (data) {
  var self = this;
  return DefaultAdapter.prototype.formatData.call(self, data);
};

SparkAdapter.prototype.normalizeAddressee = function (msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.user.roomId
  };
};

module.exports = SparkAdapter;