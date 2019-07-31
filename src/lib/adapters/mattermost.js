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


function MattermostAdapter(robot) {
  var self = this;
  DefaultAdapter.call(self, robot);
}

util.inherits(MattermostAdapter, DefaultAdapter);

MattermostAdapter.prototype.postData = function(data) {
  var self = this;

  var recipient, attachment_color, split_message,
      attachment, pretext = "";

  // If we are supposed to whisper to a single user, use a direct message
  if (data.whisper && data.user) {
    recipient = data.user;
  } else {  // Otherwise, message the channel
    recipient = data.channel;
    // If we aren't supposed to whisper, then we at least at-mention the user
    pretext = (data.user && !data.whisper) ? util.format('@%s: ', data.user) : "";
  }

  // Use the color specified in the `extra` block
  if (data.extra && data.extra.color) {
    attachment_color = data.extra.color;
  } else {
    // Assume success, and use the success color
    attachment_color = env.ST2_MATTERMOST_SUCCESS_COLOR;

    // Try to detect execution failure and use the failure color instead
    if (data.message.indexOf("status : failed") > -1) {
      attachment_color = env.ST2_MATTERMOST_FAIL_COLOR;
    }
  }

  split_message = utils.splitMessage(self.formatData(data.message));

  if (split_message.text) {
    // Default values
    var content = {
      color: attachment_color,
      "mrkdwn_in": ["text", "pretext"],
    };
    // Override the default values with values from `data.extra.mattermost`
    if (data.extra && data.extra.mattermost) {
      for (var attrname in data.extra.mattermost) { content[attrname] = data.extra.mattermost[attrname]; }
    }

    // We capture robot here so the `sendMessage` closure captures the correct
    // `this`
    var robot = self.robot;
    var chunks = split_message.text.match(/[\s\S]{1,3800}/g);

    // We define a recursive closure that calls itself with the next data to
    // send after a timeout. This approximates sending synchronous (sequential)
    // HTTP requests.
    var sendChunk = function (i) {
      content.text = chunks[i];
      content.fallback = chunks[i];

      /*
        Based on the issue Support for "Button attachments" #151
        Inorder to accept the matteruser adapter message attachments changed the attachement json
      */

      attachment = {
        room: recipient,
        attachments: content.attachments ? content.attachments : content,
        // There is likely a bug here - `split_message.text` being a true-y
        // value does not imply that `split_message.pretext` is also non-empty,
        // but we unconditionally set `text` to
        // `pretext + split_message.pretext` on the first message
        text: i === 0 ? pretext + split_message.pretext : null
      };
      robot.emit('slack-attachment', attachment);
      if (chunks.length > ++i) {
        setTimeout(function(){ sendChunk(i); }, 300);
      }
    };
    sendChunk(0);
  } else {
    self.robot.messageRoom.call(self.robot, recipient, pretext + split_message.pretext);
  }
};

module.exports = MattermostAdapter;
