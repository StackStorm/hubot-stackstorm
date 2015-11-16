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

var env = process.env,
  util = require('util'),
  utils = require('./utils.js');

/*
  SlackDataPostHandler.
*/
function SlackDataPostHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

SlackDataPostHandler.prototype.postData = function(data) {
  var recipient, attachment_color, splitted,
      pretext = "";

  if (data.whisper && data.user) {
    recipient = data.user;
  } else {
    recipient = data.channel;
    pretext = (data.user && !data.whisper) ? util.format('@%s: ', data.user) : "";
  }

  attachment_color = env.ST2_SLACK_SUCCESS_COLOR;
  if (data.message.indexOf("status : failed") > -1) {
    attachment_color = env.ST2_SLACK_FAIL_COLOR;
  }

  splitted = utils.splitMessage(this.formatter.formatData(data.message));

  if (splitted.text) {
    this.robot.emit('slack-attachment', {
      channel: recipient,
      text: pretext + splitted.pretext,
      content: {
        color: attachment_color,
        text: splitted.text,
        "mrkdwn_in": ["text", "pretext"]
      }
    });
  } else {
    this.robot.messageRoom.call(this.robot, recipient, util.format("%s\n%s", pretext, splitted.pretext));
  }
};

/*
  DefaultDataPostHandler.
*/
function DefaultFormatter(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

DefaultFormatter.prototype.postData = function(data) {
  var recipient, splitted,
      text = "";

  if (data.whisper && data.user) {
    recipient = data.user;
  } else {
    recipient = data.channel;
    text = (data.user && !data.whisper) ? util.format('%s: ', data.user) : "";
  }

  recipient = this.formatter.formatRecepient(recipient);
  text += this.formatter.formatData(data.message);

  // Ignore the delimiter in the default formatter and just concat parts.
  splitted = utils.splitMessage(text);
  this.robot.messageRoom.call(this.robot, recipient, splitted.pretext + splitted.text);
};

var dataPostHandlers = {
  'slack': SlackDataPostHandler,
  'default': DefaultFormatter
};

module.exports.getDataPostHandler = function(adapterName, robot, formatter) {
  if (!(adapterName in dataPostHandlers)) {
    robot.logger.warning(
      util.format('No post handler found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  return new dataPostHandlers[adapterName](robot, formatter);
};
