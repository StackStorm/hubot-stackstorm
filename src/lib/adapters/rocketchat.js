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
var SlackLikeAdapter = require('./slack-like');


function RocketChatAdapter(robot) {
  var self = this;
  SlackLikeAdapter.call(self, robot);
}

util.inherits(RocketChatAdapter, SlackLikeAdapter);

RocketChatAdapter.prototype.postData = function(data) {
  var self = this;

  var recipient, attachment_color, split_message,
      attachment, pretext = "";

  if (data.whisper && data.user) {
    recipient = data.user;
  } else {
    recipient = data.channel;
    pretext = (data.user && !data.whisper) ? util.format('@%s: ', data.user) : "";
  }

  if (data.extra && data.extra.color) {
    attachment_color = data.extra.color;
  } else {
    attachment_color = env.ST2_ROCKETCHAT_SUCCESS_COLOR;
    if (data.message.indexOf("status : failed") > -1) {
      attachment_color = env.ST2_ROCKETCHAT_FAIL_COLOR;
    }
  }

  split_message = utils.splitMessage(self.formatData(data.message));

  if (split_message.text) {
    var m = {};
    var content = {
      color: attachment_color,
    };
    if (data.extra && data.extra.rocketchat) {
      for (var attrname in data.extra.rocketchat) { content[attrname] = data.extra.rocketchat[attrname]; }
    }

    var chunks = split_message.text.match(/[\s\S]{1,7900}/g);
    var robot = self.robot;
    var sendChunk = function(i) {
      if (i === 0) {
        m.msg = pretext + split_message.pretext;
      }
      m.attachments = [{
          text: chunks[i],
        }];
      for (var attrname in content) { m.attachments[0][attrname] = content[attrname]; }
      robot.messageRoom.call(robot, recipient, m);
      if (chunks.length > ++i) {
        setTimeout(function(){ sendChunk(i); }, 300);
      }
    };
    sendChunk(0);
  } else {
    self.robot.messageRoom.call(self.robot, recipient, pretext + split_message.pretext);
  }
};

module.exports = RocketChatAdapter;
