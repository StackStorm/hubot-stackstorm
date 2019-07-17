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

/*jshint quotmark:false*/
/*jshint -W030*/
/*global describe, it, before, after*/
"use strict";

var chai = require("chai"),
  env = process.env,
  expect = chai.expect,
  Robot = require('./dummy-robot.js'),
  dummyAdapters = require('./dummy-adapters.js'),
  Log = require('log'),
  messaging_handler = require('../src/lib/messaging_handler'),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  util = require('util');

var MockSlackAdapter = dummyAdapters.MockSlackAdapter;
var MockBotFrameworkAdapter = dummyAdapters.MockBotFrameworkAdapter;

chai.use(sinonChai);

describe("slack post data", function() {
  var logger = new Log('info');
  var robot = new Robot(false, new MockSlackAdapter(logger));
  var messagingHandler = messaging_handler.getMessagingHandler('slack', robot);

  env.ST2_SLACK_SUCCESS_COLOR = 'dfdfdf';
  env.ST2_SLACK_FAIL_COLOR = 'danger';

  it('should post success formatted slack attachment', function() {
    robot.adapter.client.send = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      {
        "attachments":[
          {
            "color": "dfdfdf",
            "mrkdwn_in": ["text","pretext"],
            "pretext": "@stanley: ",
            "text": input.message,
            "fallback": input.message
          }
        ]
      }
    );
  });

  it('should post success formatted slack attachment without specifying a user', function() {
    robot.adapter.client.send = sinon.spy();
    var input = {
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": undefined },
      {
        "attachments":[
          {
            "color": "dfdfdf",
            "mrkdwn_in": ["text","pretext"],
            "pretext": "",
            "text": input.message,
            "fallback": input.message
          }
        ]
      }
    );
  });

  it('should post success formatted slack attachment with pretext', function() {
    robot.adapter.client.send = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: "NORMAL PRETEXT{~}normal boring text",
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      {
        "attachments":[
          {
            "color": "dfdfdf",
            "mrkdwn_in": ["text","pretext"],
            "pretext": "@stanley: NORMAL PRETEXT",
            "text": "normal boring text",
            "fallback": "normal boring text"
          }
        ]
      }
    );
  });

  it('should post success formatted slack attachment with only pretext', function() {
    robot.adapter.client.send = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: "NORMAL PRETEXT{~}",
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      "@stanley: NORMAL PRETEXT"
    );
  });

  it('should post success formatted slack attachment with an impersonated author', function() {
    robot.adapter.client.send = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        slack: {
          icon_emoji: ":slack:",
          username: "SlackBot",
          attachments: [
            {
              color: "dfdfdf",
              mrkdwn_in: ["text","pretext"],
              pretext: "@stanley: ",
              text: message,
              fallback: message
            }
          ]
        }
      }
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      input.extra.slack
    );
  });

  it('should send attachments separately', function() {
    this.clock = sinon.useFakeTimers();
    robot.adapter.client.send = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        slack: {
          icon_emoji: ":slack:",
          username: "SlackBot",
          attachments: [
            {
              color: "5fff5f",
              text: 'A'+(new Array(3500).join('B'))+'C'
            }, {
              color: "ff5f5f",
              text: 'X'+(new Array(3500).join('Y'))+'Z'
            }
          ]
        }
      }
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      { icon_emoji: ":slack:", username: "SlackBot", attachments: [
        { color: "5fff5f", text: 'A'+(new Array(3500).join('B'))+'C' }
      ]}
    );
    this.clock.tick(500);
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      { icon_emoji: ":slack:", username: "SlackBot", attachments: [
        { color: "ff5f5f", text: 'X'+(new Array(3500).join('Y'))+'Z' }
      ]}
    );
    expect(robot.adapter.client.send).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should post success formatted slack attachment with a specified author', function() {
    robot.adapter.client.send = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        color: "e5e5e5",
        slack: {
          color: "dfdfdf",
          mrkdwn_in: ["text","pretext"],
          pretext: "@stanley: ",
          text: message,
          fallback: message
        }
      }
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      { "attachments": [ input.extra.slack ] }
    );
  });

  it('should post fail formatted slack attachment', function() {
    robot.adapter.client.send = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'failed',
                           '1'),
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      {
        "attachments": [
          {
            "color": "danger",
            "text": input.message,
            "fallback": input.message,
            "mrkdwn_in": ["text", "pretext"],
            "pretext": "@stanley: "
          }
        ]
      }
    );
  });

  it('should split a long slack-attachment into chunks', function() {
    this.clock = sinon.useFakeTimers();
    robot.adapter.client.send = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: '0'+(new Array(8500).join('1'))+'2',
      whisper: false
    };
    var chunks = input.message.match(/[\s\S]{1,7900}/g);
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      {
        "attachments": [
          {
            "color": env.ST2_SLACK_SUCCESS_COLOR,
            "mrkdwn_in": ["text", "pretext"],
            "pretext": "@stanley: ",
            "text": chunks[0],
            "fallback": chunks[0]
          }
        ]
      }
    );
    this.clock.tick(500);
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "id": "#stackstorm", "room": "#stackstorm", "user": "stanley" },
      {
        "attachments": [
          {
            "pretext": null,
            "color": env.ST2_SLACK_SUCCESS_COLOR,
            "mrkdwn_in": ["text", "pretext"],
            "text": chunks[1],
            "fallback": chunks[1]
          }
        ]
      }
    );
    expect(robot.adapter.client.send).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should whisper a slack-attachment', function() {
    robot.adapter.client.send = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: true
    };
    messagingHandler.postData(input);
    expect(robot.adapter.client.send).to.have.been.calledOnce;
    expect(robot.adapter.client.send).to.have.been.calledWith(
      { "user": "stanley" },
      {
        "attachments":[
          {
            "color": "dfdfdf",
            "mrkdwn_in": ["text","pretext"],
            "pretext": "",
            "text": input.message,
            "fallback": input.message
          }
        ]
      }
    );
  });
});

describe("msteams post data", function () {
  var logMessage;
  var logger = new Log('debug');
  var robot = new Robot(false, new MockBotFrameworkAdapter(logger));
  var messagingHandler = messaging_handler.getMessagingHandler('botframework', robot);

  it('should just send', function () {
    robot.adapter.send = sinon.spy();
    var data = {
      context: {
        value: "Context value"
      },
      message: "Hello world!"
    };

    messagingHandler.postData(data);
    expect(robot.adapter.send).to.have.been.calledOnce;
    expect(robot.adapter.send).to.have.been.calledWith(data.context, data.message);
  });

  it('should warn about data.extra.botframework', function () {
    robot.logger.warning = sinon.spy();
    robot.adapter.send = sinon.spy();
    var data = {
      context: {
        value: "Context value with extra.botframework"
      },
      extra: {
        botframework: "BotFramework"
      },
      message: "Hello world with extra.botframework!"
    };

    messagingHandler.postData(data);
    expect(robot.logger.warning).to.have.been.calledOnce;
    logMessage = util.format('The extra.botframework attribute of aliases is not used yet.');
    expect(robot.logger.warning).to.have.been.calledWith(logMessage);
    expect(robot.adapter.send).to.have.been.calledOnce;
    expect(robot.adapter.send).to.have.been.calledWith(data.context, data.message);
  });

  it('should send pretext separately', function () {
    this.clock = sinon.useFakeTimers();
    robot.adapter.send = sinon.spy();
    var pretext = 'Pretext header',
        text = 'text value';
    var data = {
      context: {
        value: "Context value"
      },
      message: pretext + "{~}" + text
    };

    messagingHandler.postData(data);
    expect(robot.adapter.send).to.have.been.calledWith(data.context, pretext);
    this.clock.tick(500);
    expect(robot.adapter.send).to.have.been.calledWith(data.context, text);
    this.clock.restore();
    expect(robot.adapter.send).to.have.been.calledTwice;
  });
});

describe("mattermost post data", function() {
  var logger = new Log('info');
  var robot = new Robot(false, new MockSlackAdapter(logger));
  var messagingHandler = messaging_handler.getMessagingHandler('mattermost', robot);

  env.ST2_MATTERMOST_SUCCESS_COLOR = 'dfdfdf';
  env.ST2_MATTERMOST_FAIL_COLOR = 'danger';

  it('should post to room and mention a user', function() {
    robot.emit = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}normal boring text'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: env.ST2_MATTERMOST_SUCCESS_COLOR,
          fallback: "normal boring text",
          mrkdwn_in: ["text", "pretext"],
          text: "normal boring text"
        },
        room: input.channel,
        text: user + "NORMAL PRETEXT"
      }
    );
  });

  it('should post to room and not mention a user', function() {
    robot.emit = sinon.spy();
    var input = {
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}normal boring text'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: env.ST2_MATTERMOST_SUCCESS_COLOR,
          fallback: "normal boring text",
          mrkdwn_in: ["text", "pretext"],
          text: "normal boring text"
        },
        room: input.channel,
        text: "NORMAL PRETEXT"
      }
    );
  });

  it('should just post messgae with pretext to room', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      input.channel,
      user + "NORMAL PRETEXT"
    );
  });

  it('should post success formatted slack attachment', function() {
    robot.emit = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: env.ST2_MATTERMOST_SUCCESS_COLOR,
          fallback: input.message,
          mrkdwn_in: ["text", "pretext"],
          text: input.message
        },
        room: input.channel,
        text: user
      }
    );
  });

  it('should split a long attachment into chunks', function() {
    this.clock = sinon.useFakeTimers();
    robot.emit = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: '0'+(new Array(3800).join('1'))+'2',
      whisper: false
    };
    var user = util.format('@%s: ', input.user),
        chunks = input.message.match(/[\s\S]{1,3800}/g);

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: env.ST2_MATTERMOST_SUCCESS_COLOR,
          fallback: input.message,
          mrkdwn_in: ["text", "pretext"],
          text: chunks[0],
          fallback: chunks[0]
        },
        room: input.channel,
        text: user
      }
    );
    this.clock.tick(500);
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: env.ST2_MATTERMOST_SUCCESS_COLOR,
          fallback: input.message,
          mrkdwn_in: ["text", "pretext"],
          text: chunks[1],
          fallback: chunks[1]
        },
        room: input.channel,
        text: user
      }
    );
    expect(robot.emit).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should post success with custom color', function() {
    robot.emit = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        color: 'CUSTOM_COLOR'
      }
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: 'CUSTOM_COLOR',
          fallback: input.message,
          mrkdwn_in: ["text", "pretext"],
          text: input.message
        },
        room: input.channel,
        text: user
      }
    );
  });

  it('should post success formatted slack attachment with extra', function() {
    robot.emit = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        mattermost: {
          icon_emoji: ":mattermost:",
          username: "MattermostBot",
          attachments: [
            {
              color: "dfdfdf",
              mrkdwn_in: ["text","pretext"],
              pretext: "@stanley: ",
              text: message,
              fallback: message
            }
          ]
        }
      }
    };

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: input.extra.mattermost.attachments,
        room: input.channel,
        text: "@stanley: "
      }
    );
  });

  it('should whisper a slack-attachment', function() {
    robot.emit = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: true,
      extra: {
        mattermost: {
          icon_emoji: ":mattermost:",
          username: "MattermostBot",
          attachments: [
            {
              color: "dfdfdf",
              mrkdwn_in: ["text","pretext"],
              pretext: "@stanley: ",
              text: message,
              fallback: message
            }
          ]
        }
      }
    };

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: input.extra.mattermost.attachments,
        room: input.user,
        text: ''
      }
    );
  });

  it('should post fail formatted slack attachment', function() {
    robot.emit = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'failed',
                           '1'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment',
      {
        attachments: {
          color: env.ST2_MATTERMOST_FAIL_COLOR,
          fallback: input.message,
          mrkdwn_in: ["text", "pretext"],
          text: input.message
        },
        room: input.channel,
        text: user
      }
    );
  });
});

describe("hipchat post data", function() {
  var logger = new Log('info');
  var robot = new Robot(false, new MockSlackAdapter(logger));
  var messagingHandler = messaging_handler.getMessagingHandler('hipchat', robot);

  it('should post to channel', function() {
    this.clock = sinon.useFakeTimers();
    robot.messageRoom = sinon.spy();
    env.HUBOT_HIPCHAT_JID = 'dfd_fdf';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = 'danger';  // btf.hipchat.com

    var input = {
      channel: 'hipchat-test',
      message: 'Hello world!',
      user: 'stackstorm',
      whisper: false
    };
    var user = util.format('@%s: ', input.user),
        jid = env.HUBOT_HIPCHAT_JID.split("_")[0],
        recipient = util.format('%s_%s@%s', jid, input.channel, 'conf.hipchat.com');

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledWith(recipient, '@stackstorm: ');
    this.clock.tick(500);
    expect(robot.messageRoom).to.have.been.calledWith(recipient, '/code Hello world!');
    expect(robot.messageRoom).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should whisper to channel', function() {
    robot.send = sinon.spy();
    env.HUBOT_HIPCHAT_JID = 'dfd_fdf';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = 'danger';  // btf.hipchat.com

    var input = {
      channel: 'hipchat-test',
      message: 'Hello world!',
      user: 'stackstorm',
      whisper: true
    };
    var user = util.format('@%s: ', input.user),
        jid = env.HUBOT_HIPCHAT_JID.split("_")[0],
        recipient = util.format('%s_%s@%s', jid, input.channel, 'conf.hipchat.com');

    messagingHandler.postData(input);
    expect(robot.send).to.have.been.calledOnce;
    expect(robot.send).to.have.been.calledWith(input.channel, '/code Hello world!');
  });

  it('should post to channel with recipient', function() {
    this.clock = sinon.useFakeTimers();
    robot.messageRoom = sinon.spy();
    env.HUBOT_HIPCHAT_JID = 'dfd_fdf';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = 'danger';  // btf.hipchat.com

    var input = {
      channel: '@hipchat-test',
      message: 'Hello world!',
      user: 'stackstorm',
      whisper: false
    };
    var user = util.format('@%s: ', input.user),
        jid = env.HUBOT_HIPCHAT_JID.split("_")[0],
        recipient = util.format('%s_%s@%s', jid, input.channel, 'conf.hipchat.com');

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledWith(input.channel, '@stackstorm: ');
    this.clock.tick(500);
    expect(robot.messageRoom).to.have.been.calledWith(input.channel, '/code Hello world!');
    expect(robot.messageRoom).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should post to channel with pretext', function() {
    this.clock = sinon.useFakeTimers();
    robot.messageRoom = sinon.spy();
    env.HUBOT_HIPCHAT_JID = 'dfd_fdf';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = 'danger';  // btf.hipchat.com

    var input = {
      channel: 'hipchat-test',
      message: 'PRETEXT HEADER{~}Hello world!',
      user: 'stackstorm',
      whisper: false
    };
    var user = util.format('@%s: ', input.user),
        jid = env.HUBOT_HIPCHAT_JID.split("_")[0],
        recipient = util.format('%s_%s@%s', jid, input.channel, 'conf.hipchat.com');

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledWith(recipient, '@stackstorm: PRETEXT HEADER');
    this.clock.tick(500);
    expect(robot.messageRoom).to.have.been.calledWith(recipient, '/code Hello world!');
    expect(robot.messageRoom).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should post to channel with only pretext', function() {
    robot.messageRoom = sinon.spy();
    env.HUBOT_HIPCHAT_JID = 'dfd_fdf';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = 'danger';  // btf.hipchat.com

    var input = {
      channel: 'hipchat-test',
      message: 'PRETEXT HEADER{~}',
      user: 'stackstorm',
      whisper: false
    };
    var user = util.format('@%s: ', input.user),
        jid = env.HUBOT_HIPCHAT_JID.split("_")[0],
        recipient = util.format('%s_%s@%s', jid, input.channel, 'conf.hipchat.com');

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(recipient, '@stackstorm: PRETEXT HEADER');
  });

  it('should whisper to channel with pretext', function() {
    this.clock = sinon.useFakeTimers();
    robot.send = sinon.spy();
    env.HUBOT_HIPCHAT_JID = 'dfd_fdf';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = 'danger';  // btf.hipchat.com

    var input = {
      channel: 'hipchat-test',
      message: 'PRETEXT HEADER{~}Hello world!',
      user: 'stackstorm',
      whisper: true
    };
    var user = util.format('@%s: ', input.user),
        jid = env.HUBOT_HIPCHAT_JID.split("_")[0],
        recipient = util.format('%s_%s@%s', jid, input.channel, 'conf.hipchat.com');

    messagingHandler.postData(input);
    expect(robot.send).to.have.been.calledWith(input.channel, 'PRETEXT HEADER');
    this.clock.tick(500);
    expect(robot.send).to.have.been.calledWith(input.channel, '/code Hello world!');
    expect(robot.send).to.have.been.calledTwice;
    this.clock.restore();
  });
});

describe("spark post data", function() {
  var logger = new Log('info');
  var robot = new Robot(false, new MockSlackAdapter(logger));
  var messagingHandler = messaging_handler.getMessagingHandler('spark', robot);

  it('should post to room and mention a user', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: "normal boring text",
      whisper: false
    };
    var user = util.format('%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      {
        channel: input.channel,
        extra: undefined
      },
      user + "normal boring text"
    );
  });

  it('should post to room and not mention a user', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      channel: '#stackstorm',
      message: "normal boring text",
      whisper: false
    };
    var user = util.format('%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      {
        channel: input.channel,
        extra: undefined
      },
      "normal boring text"
    );
  });

  it('should post to room with extra', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: "normal boring text",
      whisper: false,
      extra: {
        custom1: "attribute1",
        custom2: "attribute2"
      }
    };
    var user = util.format('%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      {
        channel: input.channel,
        extra: {
          custom1: "attribute1",
          custom2: "attribute2"
        }
      },
      user + "normal boring text"
    );
  });

  it('should whisper to a user', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: "normal boring text",
      whisper: true
    };
    var user = util.format('%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      {
        user: input.user,
        extra: undefined
      },
      "normal boring text"
    );
  });

  it('should post message with pretext to room', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}normal boring text'),
      whisper: false
    };
    var user = util.format('%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      {
        channel: input.channel,
        extra: undefined
      },
      user + "NORMAL PRETEXT\nnormal boring text"
    );
  });
});

describe("rocketchat post data", function() {
  var logger = new Log('info');
  var robot = new Robot(false, new MockSlackAdapter(logger));
  var messagingHandler = messaging_handler.getMessagingHandler('rocketchat', robot);

  env.ST2_ROCKETCHAT_SUCCESS_COLOR = 'success';
  env.ST2_ROCKETCHAT_FAIL_COLOR = 'danger';

  it('should post to room and mention a user', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      input.channel,
      user + "NORMAL PRETEXT"
    );
  });

  it('should post to room and not mention a user', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      input.channel,
      "NORMAL PRETEXT"
    );
  });

  it('should post success formatted slack attachment', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      {
        attachments: [
          {
            color: env.ST2_ROCKETCHAT_SUCCESS_COLOR,
            text: input.message
          }
        ],
        msg: user
      }
    );
  });

  it('should split a long attachment into chunks', function() {
    this.clock = sinon.useFakeTimers();
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: '0'+(new Array(7900).join('1'))+'2',
      whisper: false
    };
    var user = util.format('@%s: ', input.user),
        chunks = input.message.match(/[\s\S]{1,7900}/g);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      {
        attachments: [
          {
            color: env.ST2_ROCKETCHAT_SUCCESS_COLOR,
            text: chunks[0],
          }
        ],
        msg: user
      }
    );
    this.clock.tick(500);
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      {
        attachments: [
          {
            color: env.ST2_ROCKETCHAT_SUCCESS_COLOR,
            text: chunks[1],
          }
        ],
        msg: user
      }
    );
    expect(robot.messageRoom).to.have.been.calledTwice;
    this.clock.restore();
  });

  it('should post success with custom color', function() {
    robot.messageRoom = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        color: 'CUSTOM_COLOR'
      }
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      {
        attachments: [
          {
            color: 'CUSTOM_COLOR',
            text: input.message
          }
        ],
        msg: user
      }
    );
  });

  it('should post success formatted slack attachment with extra', function() {
    robot.messageRoom = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: false,
      extra: {
        rocketchat: {
          icon_emoji: ":rocketchat:",
          username: "RocketchatBot"
        }
      }
    };

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      {
        attachments: [
          {
          color: env.ST2_ROCKETCHAT_SUCCESS_COLOR,
          icon_emoji: ":rocketchat:",
          text: message,
          username: input.extra.rocketchat.username
          }
        ],
        msg: "@stanley: "
      }
    );
  });

  it('should whisper a slack-attachment', function() {
    robot.messageRoom = sinon.spy();
    var message = util.format('%s\nstatus : %s\nexecution: %s',
                              'Short message',
                              'succeeded',
                              '1'),
        input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: message,
      whisper: true,
      extra: {
        rocketchat: {
          icon_emoji: ":rocketchat:",
          username: "RocketchatBot"
        }
      }
    };

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      'stanley',
      {
        attachments: [{
          color: env.ST2_ROCKETCHAT_SUCCESS_COLOR,
          icon_emoji: ":rocketchat:",
          text: message,
          username: input.extra.rocketchat.username
        }],
        msg: ""
      }
    );
  });

  it('should post fail formatted slack attachment', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'failed',
                           '1'),
      whisper: false
    };
    var user = util.format('@%s: ', input.user);

    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      {
        attachments: [
          {
            color: env.ST2_ROCKETCHAT_FAIL_COLOR,
            text: input.message
          }
        ],
        msg: user
      }
    );
  });
});

describe("default post data", function() {
  var robot = new Robot(false);
  var messagingHandler = messaging_handler.getMessagingHandler('default', robot);

  it('should send proper args to robot.messageRoom', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      'stanley: ' + input.message
    );
  });

  it('should send pretext and text to robot.messageRoom', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('NORMAL PRETEXT{~}normal boring text'),
      whisper: false
    };
    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      'stanley: ' + "NORMAL PRETEXT\nnormal boring text"
    );
  });

  it('should whisper to robot.messageRoom', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      user: 'stanley',
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: true
    };
    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      'stanley',
      input.message
    );
  });

  it('should send to channel via robot.messageRoom', function() {
    robot.messageRoom = sinon.spy();
    var input = {
      channel: '#stackstorm',
      message: util.format('%s\nstatus : %s\nexecution: %s',
                           'Short message',
                           'succeeded',
                           '1'),
      whisper: true
    };
    messagingHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      input.message
    );
  });
});
