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
  var recipient, execution_id, execution_details, attachment_color;

  if (data.user && data.whisper) {
    recipient = data.user;
  } else {
    recipient = data.channel;
  }
  // Some common properties.
  execution_id = utils.getExecutionIdFromMessage(data.message);
  execution_details = utils.getExecutionHistoryUrl(execution_id);
  if (!execution_details) {
    execution_details = utils.getExecutionCLICommand(execution_id);
  }
  attachment_color = env.ST2_SLACK_SUCCESS_COLOR;
  if (data.message.indexOf("status : failed") > -1) {
    attachment_color = env.ST2_SLACK_FAIL_COLOR;
  }
  var text = "";
  // PM user, notify user, or tell channel
  if (!data.whisper) {
    text = util.format('%s :', data.user);
  }
  this.robot.emit('slack-attachment', {
    channel: recipient,
    text: text,
    content: {
      color: attachment_color,
      title: "Execution " + execution_id,
      title_link: execution_details,
      text: this.formatter.formatData(data.message),
      "mrkdwn_in": ["text", "pretext"]
    }
  });
};

/*
  DefaultDataPostHandler.
*/
function DefaultFormatter(robot) {
  this.robot = robot;
}

DefaultFormatter.prototype.postData = function(data) {
  var args, recipient, execution_id, execution_details;

  args = [];
  // PM user, notify user, or tell channel
  if (data.user) {
    if (data.whisper === true) {
      recipient = data.user;
    } else {
      recipient = data.channel;
      // message = util.format('%s :\n%s', data.user, message);
      args.push(util.format('%s :', data.user));
    }
  } else {
    recipient = data.channel;
  }
  recipient = this.formatter.formatRecepient(recipient);
  args.unshift(recipient);

  args.push(this.formatter.formatData(data.message));

  execution_id = utils.getExecutionIdFromMessage(data.message);
  execution_details = utils.getExecutionHistoryUrl(execution_id);
  if (!execution_details) {
    execution_details = utils.getExecutionCLICommand(execution_id);
  }

  if (execution_details) {
    args.push(util.format('Execution details available at: %s', execution_details));
  }

  this.robot.messageRoom.apply(this.robot, args);
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
