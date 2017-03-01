"use strict";

var _ = require('lodash');
var env = process.env;
var util = require('util');
var utils = require('./../utils');
var DefaultMessagingHandler = require('./default');

function SlackMessagingHandler(robot) {
  var self = this;
  DefaultMessagingHandler.call(this, robot);

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

util.inherits(SlackMessagingHandler, DefaultMessagingHandler);

SlackMessagingHandler.prototype.postData = function(data) {
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
    attachment_color = env.ST2_SLACK_SUCCESS_COLOR;
    if (data.message.indexOf("status : failed") > -1) {
      attachment_color = env.ST2_SLACK_FAIL_COLOR;
    }
  }

  split_message = utils.splitMessage(self.formatData(data.message));

  if (split_message.text) {
    var content = {
      color: attachment_color,
      "mrkdwn_in": ["text", "pretext"],
    };
    if (data.extra && data.extra.slack) {
      for (var attrname in data.extra.slack) { content[attrname] = data.extra.slack[attrname]; }
    }
    var robot = self.robot;
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
    self.robot.messageRoom.call(self.robot, recipient, pretext + split_message.pretext);
  }
};

SlackMessagingHandler.prototype.normalizeAddressee = function(msg) {
  return {
    name: msg.message.user.name,
    room: msg.message.room
  };
};

SlackMessagingHandler.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // For slack we do not truncate or format the result. This is because
  // data is posted to slack as a message attachment.
  return data;
};

SlackMessagingHandler.prototype.formatRecepient = function(recepient) {
  return recepient;
};

SlackMessagingHandler.prototype.normalizeCommand = function(command) {
  var self = this;
  command = SlackMessagingHandler.super_.prototype.normalizeCommand.call(self, command);
  // replace left double quote with regular quote
  command = command.replace(/\u201c/g, '\u0022');
  // replace right double quote with regular quote
  command = command.replace(/\u201d/g, '\u0022');
  // replace left single quote with regular apostrophe
  command = command.replace(/\u2018/g, '\u0027');
  // replace right single quote with regular apostrophe
  command = command.replace(/\u2019/g, '\u0027');
  return command;
};

module.exports = SlackMessagingHandler;