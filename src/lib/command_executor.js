"use strict";

var _ = require('lodash'),
  env = _.clone(process.env),
  utils = require('./utils.js'),
  util = require('util'),
  postData = require('./post_data.js');


// Constants
// Fun human-friendly commands. Use %s for payload output.
var START_MESSAGES = [
  "I'll take it from here! Your execution ID for reference is %s",
  "Got it! Remember %s as your execution ID",
  "I'm on it! Your execution ID is %s",
  "Let me get right on that. Remember %s as your execution ID",
  "Always something with you. :) I'll take care of that. Your ID is %s",
  "I have it covered. Your execution ID is %s",
  "Let me start up the machine! Your execution ID is %s",
  "I'll throw that task in the oven and get cookin'! Your execution ID is %s",
  "Want me to take that off your hand? You got it! Don't forget your execution ID: %s",
  "River Tam will get it done with her psychic powers. Your execution ID is %s"
];

var ERROR_MESSAGES = [
  "I'm sorry, Dave. I'm afraid I can't do that. {~} %s"
];


var setup_postback_route = function (robot) {
  robot.router.post('/hubot/st2', function (req, res) {
    var data;

    try {
      if (req.body.payload) {
        data = JSON.parse(req.body.payload);
      } else {
        data = req.body;
      }
      // Special handler to try and figure out when a hipchat message
      // is a whisper:
      if (robot.adapterName === 'hipchat' && !data.whisper && data.channel.indexOf('@') > -1) {
        data.whisper = true;
        robot.logger.debug('Set whisper to true for hipchat message');
      }

      postDataHandler.postData(data);

      res.send('{"status": "completed", "msg": "Message posted successfully"}');
    } catch (e) {
      robot.logger.error("Unable to decode JSON: " + e);
      robot.logger.error(e.stack);
      res.send('{"status": "failed", "msg": "An error occurred trying to post the message: ' + e + '"}');
    }
  });
}

function CommandExecutor(robot) {
  this.robot = robot;
  this.st2_action_aliases = [];
  setup_postback_route(robot);
}

CommandExecutor.prototype.sendAck = function (msg, res) {
  var history_url = utils.getExecutionHistoryUrl(res.execution);
  var history = history_url ? util.format(' (details available at %s)', history_url) : '';

  if (res.actionalias && res.actionalias.ack) {
    if (res.actionalias.ack.enabled === false) {
      return;
    } else if (res.actionalias.ack.append_url === false) {
      history = '';
    }
  }

  if (res.message) {
    return msg.send(res.message + history);
  }

  var message = util.format(_.sample(START_MESSAGES), res.execution.id);
  return msg.send(message + history);
};

CommandExecutor.prototype.createExecution = function (msg, payload) {
  this.robot.logger.debug('Sending command payload:', JSON.stringify(payload));

  api.aliasExecution.create(payload)
    .then(function (res) { this.sendAck(msg, res); })
    .catch(function (err) {
      // Compatibility with older StackStorm versions
      if (err.status === 200) {
        return this.sendAck(msg, { execution: { id: err.message } });
      }
      this.robot.logger.error('Failed to create an alias execution:', err);
      var addressee = utils.normalizeAddressee(msg, robot.adapterName);
      var message = util.format(_.sample(ERROR_MESSAGES), err.message);
      if (err.requestId) {
        message = util.format(
          message,
          util.format('; Use request ID %s to grep st2 api logs.', err.requestId));
      }
      postDataHandler.postData({
        whisper: false,
        user: addressee.name,
        channel: addressee.room,
        message: message,
        extra: {
          color: '#F35A00'
        }
      });
      throw err;
    });
};

CommandExecutor.prototype.execute = function (msg, command_name, format_string, command, action_alias) {
  var addressee = utils.normalizeAddressee(msg, this.robot.adapterName);
  var payload = {
    'name': command_name,
    'format': format_string,
    'command': command,
    'user': addressee.name,
    'source_channel': addressee.room,
    'notification_route': env.ST2_ROUTE || 'hubot'
  };

  if (utils.enable2FA(action_alias)) {
    var twofactor_id = uuid.v4();
    this.robot.logger.debug('Requested an action that requires 2FA. Guid: ' + twofactor_id);
    msg.send(TWOFACTOR_MESSAGE);
    api.executions.create({
      'action': env.HUBOT_2FA,
      'parameters': {
        'uuid': twofactor_id,
        'user': addressee.name,
        'channel': addressee.room,
        'hint': action_alias.description
      }
    });
    twofactor[twofactor_id] = {
      'msg': msg,
      'payload': payload
    };
  } else {
    this.createExecution(msg, payload);
  }
}