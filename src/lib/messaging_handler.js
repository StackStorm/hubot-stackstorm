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
  SlackMessagingHandler.
*/
function SlackMessagingHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;

  var sendMessageRaw = function(message) {
    /*jshint validthis:true */
    message['channel'] = this.id;
    message['parse'] = 'none';
    this._client._send(message);
  };

  if (robot.adapter && robot.adapter.constructor && robot.adapter.constructor.name === 'SlackBot') {
    for (var channel in robot.adapter.client.channels) {
      robot.adapter.client.channels[channel].sendMessage = sendMessageRaw.bind(robot.adapter.client.channels[channel]);
    }
  }
}

SlackMessagingHandler.prototype.postData = function(data) {
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

  if (split_message.text) {
    var content = {
      color: attachment_color,
      "mrkdwn_in": ["text", "pretext"],
    };
    if (data.extra && data.extra.slack) {
      for (var attrname in data.extra.slack) { content[attrname] = data.extra.slack[attrname]; }
    }
    var robot = this.robot;
    var chunks = split_message.text.match(/[\s\S]{1,7900}/g);
    var sendChunk = function (i) {
      content.text = chunks[i];
      content.fallback = chunks[i];
      attachment = {
        channel: recipient,
        content: content,
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

SlackMessagingHandler.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

/*
  HipchatMessagingHandler.
*/
function HipchatMessagingHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

HipchatMessagingHandler.prototype.postData = function(data) {
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

SlackMessagingHandler.normalizeAddressee = function(msg) {
  var name = msg.message.user.name;
  var room = msg.message.room;
  if (room === undefined) {
    room = msg.message.user.jid;
  }
  return {
    name: name,
    room: room
  };
};

/*
  YammerMessagingHandler.
*/
function YammerMessagingHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

YammerMessagingHandler.prototype.postData = function(data) {
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

YammerMessagingHandler.normalizeAddressee = function(msg) {
  return {
    name: String(msg.message.user.thread_id),
    room: msg.message.room
  };
};

/*
  DefaultMessagingHandler.
*/
function DefaultMessagingHandler(robot, formatter) {
  this.robot = robot;
  this.formatter = formatter;
}

DefaultMessagingHandler.prototype.postData = function(data) {
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

DefaultMessagingHandler.normalizeAddressee = function(msg) {
  return {
    room: msg.message.user.room,
    name: msg.message.user.name
  };
};

var messagingHandlers = {
  'slack': SlackMessagingHandler,
  'hipchat': HipchatMessagingHandler,
  'yammer': YammerMessagingHandler,
  'default': DefaultMessagingHandler
};

module.exports.getMessagingHandler = function(adapterName, robot, formatter) {
  if (!(adapterName in messagingHandlers)) {
    robot.logger.warning(
      util.format('No post handler found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  robot.logger.debug(
    util.format('Using %s post data handler.', adapterName));
  return new messagingHandlers[adapterName](robot, formatter);
};
