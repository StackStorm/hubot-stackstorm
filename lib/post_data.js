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
  messages = require('./slack-messages.js'),
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
  var recipient, attachment_color, split_message,
      attachment, pretext = "";
  var envelope, robot = this.robot;

  if (data.whisper && data.user) {
    recipient = data.user;
    envelope = {
      "user": data.user
    };
  } else {
    recipient = data.channel;
    pretext = (data.user && !data.whisper) ? util.format('@%s: ', data.user) : "";
    envelope = {
      "room": data.channel,
      "id": data.channel,
      "user": data.user,
    };
  }

  // Allow packs to specify arbitrary keys
  if (data.extra && data.extra.slack && data.extra.slack.attachments) {
    // Action:
    //
    // result:
    //   format: ...
    //   extra:
    //     slack:
    //       icon_emoji: ":jira:"
    //       username: Jira Bot
    //       attachments:
    //         -
    //           fallback: "Info about Jira ticket {{ execution.result.result.key }}"
    //           color: "#042A60"
    //           title: "{{ execution.result.result.key }}"
    //           title_link: "{{ execution.result.result.url }}"
    //           fields:
    //             -
    //               title: Summary
    //               value: "{{ execution.result.result.summary }}"
    //               short: false
    //
    // becomes:
    //
    // {
    //   "icon_emoji": ":jira:",
    //   "username": "Jira Bot",
    //   "attachments": [
    //     {
    //       "fallback": "Info about Jira ticket {{ execution.result.result.key }}",
    //       "color": "#042A60",
    //       "title": "{{ execution.result.result.key }}",
    //       "title_link": "{{ execution.result.result.url }}",
    //       "fields": [
    //         {
    //           "title": "Summary",
    //           "value": "{{ execution.result.result.summary }}",
    //           "short": false
    //         }
    //       ],
    //     }
    //   ]
    // }

    var messages_to_send = messages.buildMessages(data.extra.slack);

    var sendMessage = function (i) {
      robot.adapter.client.send(envelope, messages_to_send[i]);

      if (messages_to_send.length > ++i) {
        setTimeout(function(){sendMessage(i);}, 300);
      }
    };

    sendMessage(0);

    return;
  }

  if (data.extra && data.extra.color) {
    attachment_color = data.extra.color;
  } else {
    attachment_color = env.ST2_SLACK_SUCCESS_COLOR;
    if (data.message.indexOf("status : failed") > -1) {
      attachment_color = env.ST2_SLACK_FAIL_COLOR;
    }
  }

  split_message = utils.splitMessage(this.formatter.formatData(data.message));

  if (split_message.text) {
    var content = {
      color: attachment_color,
      "mrkdwn_in": ["text", "pretext"],
    };
    if (data.extra && data.extra.slack) {
      // Backwards compatibility

      // Action:
      //
      // result:
      //   format: ...
      //   extra:
      //     slack:
      //       author_name: Jira_Bot
      //       author_link: "https://stackstorm.com"
      //       author_icon: "https://stackstorm.com/favicon.ico"
      //       color: "#042A60"
      //       fallback: "Info about Jira ticket {{ execution.result.result.key }}"
      //       title: "{{ execution.result.result.key }}"
      //       title_link: "{{ execution.result.result.url }}"
      //       fields:
      //         -
      //           title: Summary
      //           value: "{{ execution.result.result.summary }}"
      //           short: false
      //
      // becomes:
      //
      // {
      //   "attachments": [
      //     {
      //       "author_name": "Jira Bot",
      //       "author_link": "https://stackstorm.com",
      //       "author_icon": "https://stackstorm.com/favicon.ico",
      //       "color": "#042A60",
      //       "fallback": "Info about Jira ticket {{ execution.result.result.key }}",
      //       "title": "{{ execution.result.result.key }}",
      //       "title_link": "{{ execution.result.result.url }}",
      //       "fields": [
      //         {
      //           "title": "Summary",
      //           "value": "{{ execution.result.result.summary }}",
      //           "short": false
      //         }
      //       ]
      //     }
      //   ]
      // }

      for (var attrname in data.extra.slack) { content[attrname] = data.extra.slack[attrname]; }
    }

    var chunks = split_message.text.match(/[\s\S]{1,7900}/g);
    var sendChunk = function (i) {
      content.pretext = i === 0 ? pretext + split_message.pretext : null;
      content.text = chunks[i];
      content.fallback = chunks[i];
      robot.adapter.client.send(envelope, {'attachments': [content]});

      if (chunks.length > ++i) {
        setTimeout(function(){ sendChunk(i); }, 300);
      }
    };
    sendChunk(0);
  } else {
    this.robot.adapter.client.send(envelope, pretext + split_message.pretext);
  }
};

/*
  MattermostDataPostHandler.
*/
function MattermostDataPostHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

MattermostDataPostHandler.prototype.postData = function(data) {
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
    attachment_color = env.ST2_MATTERMOST_SUCCESS_COLOR;

    if (data.message.indexOf("status : failed") > -1) {
      attachment_color = env.ST2_MATTERMOST_FAIL_COLOR;
    }
  }

  split_message = utils.splitMessage(this.formatter.formatData(data.message));

  if (split_message.text) {
    var content = {
      color: attachment_color,
      "mrkdwn_in": ["text", "pretext"],
    };
    if (data.extra && data.extra.mattermost) {
      for (var attrname in data.extra.mattermost) { content[attrname] = data.extra.mattermost[attrname]; }
    }
    var robot = this.robot;
    var chunks = split_message.text.match(/[\s\S]{1,3800}/g);

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
        text: i === 0 ? pretext + split_message.pretext : null
      };
      robot.emit('slack-attachment', attachment);
      if (chunks.length > ++i) {
        setTimeout(function(){ sendChunk(i); }, 300);
      }
    };
    sendChunk(0);
  } else {
    this.robot.messageRoom.call(this.robot, recipient, pretext + split_message.pretext);
  }
};

/*
  HipchatDataPostHandler.
*/
function HipchatDataPostHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

HipchatDataPostHandler.prototype.postData = function(data) {
  var recipient, split_message, formatted_message,
      pretext = "";

  recipient = data.channel;
  if (data.user && !data.whisper) {
    pretext = util.format('@%s: ', data.user);
  }

  if (recipient.indexOf('@') === -1 ) {
    recipient = this.formatter.formatRecepient(recipient);
  }
  split_message = utils.splitMessage(data.message);
  if (pretext) {
    split_message.pretext = pretext + split_message.pretext;
  }

  /*  Hipchat is unable to render text and code in the
      same message, so split them */
  if (split_message.pretext) {
    if (data.whisper) {
      this.robot.send.call(this.robot, data.channel, split_message.pretext);
    } else {
      this.robot.messageRoom.call(this.robot, recipient, split_message.pretext);
    }
  }
  if (split_message.text) {
    if (data.whisper) {
      this.robot.send.call(this.robot, data.channel, this.formatter.formatData(split_message.text));
    } else {
      this.robot.messageRoom.call(this.robot, recipient, this.formatter.formatData(split_message.text));
    }
  }
};

/*
  Spark Handler.
*/
function SparkDataPostHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

SparkDataPostHandler.prototype.postData = function(data) {
  var recipient, split_message, formatted_message,
      text = "";

  if (data.whisper && data.user) {
    recipient = { user: data.user };
  } else {
    recipient = { channel: data.channel };
    text = (data.user && !data.whisper) ? util.format('%s: ', data.user) : "";
  }

  recipient = this.formatter.formatRecepient(recipient);
  recipient.extra = data.extra;
  text += this.formatter.formatData(data.message);

  // Ignore the delimiter in the default formatter and just concat parts.
  split_message = utils.splitMessage(text);
  if (split_message.pretext && split_message.text) {
    formatted_message = util.format("%s\n%s", split_message.pretext, split_message.text);
  } else {
    formatted_message = split_message.pretext || split_message.text;
  }

  this.robot.messageRoom.call(this.robot, recipient, formatted_message);
};

/*
  RocketChatDataPostHandler.
*/
function RocketChatDataPostHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

RocketChatDataPostHandler.prototype.postData = function(data) {
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

  split_message = utils.splitMessage(this.formatter.formatData(data.message));

  if (split_message.text) {
    var m = {};
    var content = {
      color: attachment_color,
    };
    if (data.extra && data.extra.rocketchat) {
      for (var attrname in data.extra.rocketchat) { content[attrname] = data.extra.rocketchat[attrname]; }
    }

    var chunks = split_message.text.match(/[\s\S]{1,7900}/g);
    var robot = this.robot;
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
    this.robot.messageRoom.call(this.robot, recipient, pretext + split_message.pretext);
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
  var recipient, split_message, formatted_message,
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
  split_message = utils.splitMessage(text);
  if (split_message.pretext && split_message.text) {
    formatted_message = util.format("%s\n%s", split_message.pretext, split_message.text);
  } else {
    formatted_message = split_message.pretext || split_message.text;
  }

  this.robot.messageRoom.call(this.robot, recipient, formatted_message);
};

var dataPostHandlers = {
  'slack': SlackDataPostHandler,
  'matteruser': MattermostDataPostHandler,
  'mattermost': MattermostDataPostHandler,
  'hipchat': HipchatDataPostHandler,
  'spark': SparkDataPostHandler,
  'rocketchat': RocketChatDataPostHandler,
  'default': DefaultFormatter
};

module.exports.getDataPostHandler = function(adapterName, robot, formatter) {
  if (!(adapterName in dataPostHandlers)) {
    robot.logger.warning(
      util.format('No post handler found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  robot.logger.debug(
    util.format('Using %s post data handler.', adapterName));
  return new dataPostHandlers[adapterName](robot, formatter);
};
