"use strict";

var _ = require('lodash');
var env = process.env;
var util = require('util');
var utils = require('./../utils');
var DefaultMessagingHandler = require('./default');

function YammerMessagingHandler(robot) {
  DefaultMessagingHandler.call(this, robot);
}

util.inherits(YammerMessagingHandler, DefaultMessagingHandler);

YammerMessagingHandler.prototype.postData = function(data) {
  var recipient, split_message, formatted_message,
      text = "";

  if (data.whisper && data.user) {
    recipient = { name: data.user, thread_id: data.channel };
  } else {
    recipient = { name: data.user, thread_id: data.channel };
    text = (data.user && !data.whisper) ? util.format('@%s: ', data.user) : "";
  }

  recipient = this.formatRecepient(recipient);
  text += this.formatData(data.message);

  // Ignore the delimiter in the default formatter and just concat parts.
  split_message = utils.splitMessage(text);
  if (split_message.pretext && split_message.text) {
    formatted_message = util.format("%s\n%s", split_message.pretext, split_message.text);
  } else {
    formatted_message = split_message.pretext || split_message.text;
  }

  this.robot.send.call(this.robot, recipient, formatted_message);
};

YammerMessagingHandler.prototype.normalizeAddressee = function(msg) {
  return {
    name: String(msg.message.user.thread_id),
    room: msg.message.room
  };
};

module.exports = YammerMessagingHandler;