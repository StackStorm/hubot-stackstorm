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
  formatData = require('../lib/format_data.js'),
  postData = require('../lib/post_data.js'),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  util = require('util');

chai.use(sinonChai)

describe("slack post data", function() {
  var robot, formatter, postDataHandler;

  robot = new Robot(false);
  formatter = formatData.getFormatter('slack', robot);
  postDataHandler = postData.getDataPostHandler('slack', robot, formatter);

  env.ST2_SLACK_SUCCESS_COLOR = 'dfdfdf';
  env.ST2_SLACK_FAIL_COLOR = 'danger';

  it('should post success formatted slack-attachment', function() {
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
    postDataHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment', {
        channel: input.channel,
        content: {
          color: env.ST2_SLACK_SUCCESS_COLOR,
          mrkdwn_in: ["text", "pretext"],
          text: input.message,
          title: "Execution 1",
          title_link: "st2 execution get 1"
        },
        text: "stanley :"
      }
    );
  });

  it('should post fail formatted slack-attachment', function() {
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
    postDataHandler.postData(input);
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment', {
        channel: input.channel,
        content: {
          color: env.ST2_SLACK_FAIL_COLOR,
          mrkdwn_in: ["text", "pretext"],
          text: input.message,
          title: "Execution 1",
          title_link: "st2 execution get 1"
        },
        text: "stanley :"
      }
    );
  });

  it('should whisper a slack-attachment', function() {
    robot.emit = sinon.spy();
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
    expect(robot.emit).to.have.been.calledOnce;
    expect(robot.emit).to.have.been.calledWith(
      'slack-attachment', {
        channel: input.user,
        content: {
          color: env.ST2_SLACK_SUCCESS_COLOR,
          mrkdwn_in: ["text", "pretext"],
          text: input.message,
          title: "Execution 1",
          title_link: "st2 execution get 1"
        },
        text: ""
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
      'stanley :',
      input.message,
      util.format('Execution details available at: st2 execution get %s', '1')
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
      input.message,
      util.format('Execution details available at: st2 execution get %s', '1')
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
      input.message,
      util.format('Execution details available at: st2 execution get %s', '1')
    );
  });

});
