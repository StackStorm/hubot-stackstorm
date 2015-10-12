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

/*
  SlackDataPostHandler.
*/
function SlackDataPostHandler(robot) {
  this.robot = robot;
}

SlackDataPostHandler.prototype.postData = function(data) {
  // Some common properties.
  execution_id = utils.getExecutionIdFromMessage(data.message);
  execution_details = utils.getExecutionHistoryUrl(execution_id);
  if (!execution_details) {
    execution_details = utils.getExecutionCLICommand(execution_id);
  }
  var attachment_color = env.ST2_SLACK_SUCCESS_COLOR;
  if (data.message.indexOf("status : failed") > -1) {
    attachment_color = env.ST2_SLACK_FAIL_COLOR;
  }
  var text = "";
  // PM user, notify user, or tell channel
  if (data.whisper != true) {
    text = util.format('%s :', data.user);
  }
  robot.emit('slack-attachment', {
    channel: recipient,
    text: text,
    content: {
      color: attachment_color,
      title: "Execution " + execution_id,
      title_link: execution_details,
      text: formatter.formatData(data.message),
      "mrkdwn_in": ["text", "pretext"]
    }
  });
}

/*
  DefaultDataPostHandler.
*/
function DefaultFormatter(robot) {
  this.robot = robot;
}

DefaultFormatter.prototype.postData = function(data) {
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
  recipient = formatter.formatRecepient(recipient);
  args.unshift(recipient);

  args.push(formatter.formatData(data.message));

  execution_id = utils.getExecutionIdFromMessage(data.message);
  execution_details = utils.getExecutionHistoryUrl(execution_id);
  if (!execution_details) {
    execution_details = utils.getExecutionCLICommand(execution_id);
  }

  if (execution_details) {
    args.push(util.format('Execution details available at: %s', execution_details));
  }

  robot.messageRoom.apply(robot, args);
}

var dataPostHandlers = {
  'slack': SlackDataPostHandler,
  'default': DefaultFormatter
};

module.exports.getDataPostHandler = function(adapterName, robot) {
  if (!(adapterName in dataPostHandlers)) {
    robot.logger.warning(
      util.format('No supported formatter found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  return new dataPostHandlers[adapterName](robot);
};
