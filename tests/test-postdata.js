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

/*jshint quotmark:false*/
/*jshint -W030*/
/*global describe, it, before, after*/
"use strict";

var chai = require("chai"),
  env = process.env,
  expect = chai.expect,
  Robot = require('./dummy-robot.js'),
  MockSlackAdapter = require('./dummy-adapters.js'),
  Log = require('log'),
  formatData = require('../lib/format_data.js'),
  postData = require('../lib/post_data.js'),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  util = require('util');

chai.use(sinonChai);

describe("slack post data", function() {
  var robot, formatter, postDataHandler;
  var logger = new Log('info');
  robot = new Robot(false, new MockSlackAdapter(logger));
  formatter = formatData.getFormatter('slack', robot);
  postDataHandler = postData.getDataPostHandler('slack', robot, formatter);

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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
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

describe("default post data", function() {
  var robot, formatter, postDataHandler;

  robot = new Robot(false);
  formatter = formatData.getFormatter('default', robot);
  postDataHandler = postData.getDataPostHandler('default', robot, formatter);

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
    postDataHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      'stanley: ' + input.message
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
    postDataHandler.postData(input);
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
    postDataHandler.postData(input);
    expect(robot.messageRoom).to.have.been.calledOnce;
    expect(robot.messageRoom).to.have.been.calledWith(
      '#stackstorm',
      input.message
    );
  });

});
