// Copyright 2026 The StackStorm Authors.
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

/*global describe, it*/
"use strict";

var expect = require("chai").expect,
  Robot = require('./dummy-robot.js'),
  Logger = require('./dummy-logger.js'),
  adapters = require('../src/lib/adapters'),
  SlackAdapter = require('../src/lib/adapters/slack.js'),
  DefaultAdapter = require('../src/lib/adapters/default.js');

describe("adapter selection", function() {
  var robot = new Robot(false, null, false);
  robot.logger = new Logger(false);

  it("uses Slack formatting for the hubot-slack package name (hubot 11 to 13.1.1)", function() {
    expect(adapters.getAdapter('@hubot-friends/hubot-slack', robot)).to.be.an.instanceof(SlackAdapter);
  });

  it("uses Slack formatting for hubot-slack's class name (hubot 13.1.2 and later)", function() {
    expect(adapters.getAdapter('SlackBot', robot)).to.be.an.instanceof(SlackAdapter);
  });

  it("falls back to plain text for adapters it doesn't know", function() {
    expect(adapters.getAdapter('Shell', robot)).to.be.an.instanceof(DefaultAdapter);
  });
});
