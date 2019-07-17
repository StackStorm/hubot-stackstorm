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
var DefaultMessagingHandler = require('./default');


function HipChatMessagingHandler(robot) {
  var self = this;
  DefaultMessagingHandler.call(self, robot);
};

util.inherits(HipChatMessagingHandler, DefaultMessagingHandler);

HipChatMessagingHandler.prototype.postData = function(data) {
  var self = this;

  var recipient, split_message, formatted_message,
      // Special handler to try and figure out when a hipchat message
      // is a whisper:
      whisper = data.whisper && (data.channel.indexOf('@') > -1),
      pretext = "";

  recipient = data.channel;
  if (data.user && !data.whisper) {
    pretext = util.format('@%s: ', data.user);
  }

  if (recipient.indexOf('@') === -1 ) {
    recipient = self.formatRecipient(recipient);
  }
  split_message = utils.splitMessage(data.message);
  if (pretext) {
    split_message.pretext = pretext + split_message.pretext;
  }

  /*  HipChat is unable to render text and code in the
      same message, so split them */
  if (split_message.pretext) {
    if (data.whisper) {
      self.robot.send.call(self.robot, data.channel, split_message.pretext);
    } else {
      self.robot.messageRoom.call(self.robot, recipient, split_message.pretext);
    }
  }
  if (split_message.text) {
    if (data.whisper) {
      self.robot.send.call(self.robot, data.channel, self.formatData(split_message.text));
    } else {
      self.robot.messageRoom.call(self.robot, recipient, self.formatData(split_message.text));
    }
  }
};

HipChatMessagingHandler.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // HipChat has "show more" capability in messages so no truncation.
  return '/code ' + data;
};

HipChatMessagingHandler.prototype.formatRecipient = function(recipient) {
  var robot_name = env.HUBOT_HIPCHAT_JID.split("_")[0];
  var hipchat_domain = (env.HUBOT_HIPCHAT_XMPP_DOMAIN === 'btf.hipchat.com') ?
                       'conf.btf.hipchat.com' : 'conf.hipchat.com';
  return util.format('%s_%s@%s', robot_name, recipient, hipchat_domain);
};

HipChatMessagingHandler.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.mention_name,
    room: msg.message.user.jid
  };
};

module.exports = HipChatMessagingHandler;
