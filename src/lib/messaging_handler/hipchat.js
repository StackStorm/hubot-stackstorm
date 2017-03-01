"use strict";

var _ = require('lodash');
var env = process.env;
var util = require('util');
var utils = require('./../utils');
var DefaultMessagingHandler = require('./default');


function HipchatMessagingHandler(robot) {
  var self = this;
  DefaultMessagingHandler.call(self, robot);
}

util.inherits(HipchatMessagingHandler, DefaultMessagingHandler);

HipchatMessagingHandler.prototype.postData = function(data) {
  var self = this;
  var recipient, split_message, formatted_message,
      pretext = "";

  recipient = data.channel;
  if (data.user && !data.whisper) {
    pretext = util.format('@%s: ', data.user);
  }

  if (recipient.indexOf('@') === -1 ) {
    recipient = self.formatRecepient(recipient);
  }
  split_message = utils.splitMessage(data.message);
  if (pretext) {
    split_message.pretext = pretext + split_message.pretext;
  }

  /*  Hipchat is unable to render text and code in the
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

HipchatMessagingHandler.prototype.normalizeAddressee = function(msg) {
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

HipchatMessagingHandler.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // HipChat has "show more" capability in messages so no truncation.
  return '/code ' + data;
};

HipchatMessagingHandler.prototype.formatRecepient = function(recepient) {
  var robot_name = env.HUBOT_HIPCHAT_JID.split("_")[0];
  var hipchat_domain = (env.HUBOT_HIPCHAT_XMPP_DOMAIN === 'btf.hipchat.com') ?
                       'conf.btf.hipchat.com' : 'conf.hipchat.com';
  return util.format('%s_%s@%s', robot_name, recepient, hipchat_domain);
};

HipchatMessagingHandler.prototype.normalizeCommand = function(command) {
  var self = this;
  return HipchatMessagingHandler.super_.prototype.normalizeCommand.call(self, command);
};

module.exports = HipchatMessagingHandler;
