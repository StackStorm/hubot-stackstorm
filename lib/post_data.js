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
    attachment_color = env.ST2_SLACK_SUCCESS_COLOR;
    if (data.message.indexOf("status : failed") > -1) {
      attachment_color = env.ST2_SLACK_FAIL_COLOR;
    }
  }

  split_message = utils.splitMessage(this.formatter.formatData(data.message));
  var attachments = [];
  if (data.extra && data.extra.slack && data.extra.slack.attachments) {
	   for(var i=0, len=data.extra.slack.attachments.length; i < len; i++) { attachments.push(data.extra.slack.attachments[i]); }
  }  
  if (split_message.text) {
    attachment = {
      color: attachment_color,
      text: split_message.text,
      "mrkdwn_in": ["text", "pretext"],
      fallback: split_message.text
    };
    if (data.extra && data.extra.slack && data.extra.slack.content) {
      for (var attrname in data.extra.slack.content) { attachment[attrname] = data.extra.slack.content[attrname]; }
    }
    attachments.unshift(attachment);
  } else {
    this.robot.messageRoom.call(this.robot, recipient, pretext + split_message.pretext);
  }
    if ( attachments.length > 0 ) {
      this.robot.emit('slack-attachment', {
        channel: recipient,
        content: attachments
     });    	
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
  Yammer Handler.
*/
function YammerDataPostHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

YammerDataPostHandler.prototype.postData = function(data) {
  var recipient, split_message, formatted_message,
      text = "";

  if (data.whisper && data.user) {
    recipient = { name: data.user, thread_id: data.channel };
  } else {
    recipient = { name: data.user, thread_id: data.channel };
    text = (data.user && !data.whisper) ? util.format('@%s: ', data.user) : "";
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

  this.robot.send.call(this.robot, recipient, formatted_message);
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
  'hipchat': HipchatDataPostHandler,
  'yammer': YammerDataPostHandler,
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
