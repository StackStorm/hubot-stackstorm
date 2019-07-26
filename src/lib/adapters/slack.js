// Copyright 2019 Extreme Networks, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var _ = require('lodash');
var env = process.env;
var util = require('util');
var utils = require('./../utils');
var messages = require('./../slack-messages');
var DefaultAdapter = require('./default');


// NOTE: Be careful about making changes to this adapter, because the adapters
//       for Mattermost, Cisco Spark, and Rocketchat all inherit from this one
function SlackAdapter(robot) {
  var self = this;
  DefaultAdapter.call(self, robot);

  // We monkey patch sendMessage function to send "parse" argument with the message so the text is not
  // formatted and parsed on the server side.
  // NOTE / TODO: We can get rid of this nasty patch once our node-slack-client and hubot-slack pull
  // requests are merged.
  // This code was refactored in https://github.com/StackStorm/hubot-stackstorm/pull/6
  // which was opened and merged by Kami on 2015-06-04.
  // As of 2019-05-22, these were the PRs I could find for the node-slack-client
  // hubot-slack repositories:
  // * https://github.com/slackapi/node-slack-sdk/pull/42
  //   - which was closed during a refactor and converted into an issue:
  //     https://github.com/slackapi/node-slack-sdk/issues/138
  // * https://github.com/slackapi/hubot-slack/pull/544
  //   - which was opened on 2018-11-14, which seems to be too late to actually
  //     apply to the original code in lib/slack_monkey_patch.js (see the Git history)
  // So...I'm not entirely sure this monkey patch is still necessary.
  // End-to-end testing is required to figure out for sure.
  var sendMessageRaw = function(message) {
    /*jshint validthis:true */
    message['channel'] = this.id;
    message['parse'] = 'none';
    this._client._send(message);
  }

  if (robot.adapter && robot.adapter.constructor && robot.adapter.constructor.name === 'SlackBot') {
    for (var channel in robot.adapter.client.channels) {
      robot.adapter.client.channels[channel].sendMessage = sendMessageRaw.bind(robot.adapter.client.channels[channel]);
    }
  }
};

util.inherits(SlackAdapter, DefaultAdapter);

SlackAdapter.prototype.getUserId = function (user_object) {
  var self = this;

  return user_object.id;
};

SlackAdapter.prototype.getUsername = function (user_object) {
  var self = this;

  return user_object.name;
};

SlackAdapter.prototype.getUserFullName = function (user_object) {
  var self = this;

  return user_object.real_name;
};

SlackAdapter.prototype.getPrivateRoom = function (user_object) {
  var self = this;

  return user_object;
};

SlackAdapter.prototype.isPrivateRoom = function (obj) {
  let room = obj;
  if (obj.hasOwnProperty('room')) {
    room = obj.room;
  }
  return room.startsWith('D');
};

SlackAdapter.prototype.sendPrivateMessage = function(user, message) {
  var self = this;
  var envelope = _.clone(user);
  envelope.room = user.id;
  return self.robot.adapter.client.send(envelope, message);
};

SlackAdapter.prototype.postData = function(data) {
  var self = this;
  var recipient, attachment_color, split_message,
      attachment, pretext = "";
  var envelope,
      // We capture robot here so the `sendMessage` closure captures the
      // correct `this`
      robot = self.robot;

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

  split_message = utils.splitMessage(self.formatData(data.message));

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
    self.robot.adapter.client.send(envelope, pretext + split_message.pretext);
  }
};

SlackAdapter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // For slack we do not truncate or format the result. This is because
  // data is posted to slack as a message attachment.
  return data;
};

SlackAdapter.prototype.formatRecipient = function(recipient) {
  return recipient;
};

SlackAdapter.prototype.normalizeCommand = function(command) {
  var self = this;
  command = SlackAdapter.super_.prototype.normalizeCommand.call(self, command);
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

module.exports = SlackAdapter;
