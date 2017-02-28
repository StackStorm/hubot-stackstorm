"use strict";

var _ = require('lodash');
var env = process.env;
var util = require('util');
var utils = require('./../utils');
var truncate = require('truncate');
var hubot_alias = env.HUBOT_ALIAS;

function DefaultMessagingHandler(robot) {
  this.robot = robot;
  this.truncate_length = env.ST2_MAX_MESSAGE_LENGTH;
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

  recipient = this.formatRecepient(recipient);
  text += this.formatData(data.message);

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

DefaultMessagingHandler.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  if (this.truncate_length > 0) {
    data = truncate(data, this.truncate_length);
  }
  return data;
};

DefaultMessagingHandler.prototype.formatRecepient = function(recepient) {
  return recepient;
};

DefaultMessagingHandler.prototype.normalizeCommand = function(command) {
  return command.replace(/^${hubot_alias}/, "").trim();
};

module.exports = DefaultMessagingHandler;