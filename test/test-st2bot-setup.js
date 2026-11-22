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

var expect = require("chai").expect,
  nock = require('nock').default,  // an ES module since nock 14
  mockedEnv = require('mocked-env'),
  support = require('./support/robot.js');

var ALIASES = require('./fixtures/aliases.json');

describe("stanley the StackStorm bot", function() {
  var robot, user, stop, restore_env, logs = [];

  before(async function() {
    restore_env = mockedEnv({ ST2_API_KEY: 'test-key' }, { clear: false });
    nock('http://localhost:9101')
      .get('/v1/actionalias')
      .query({ limit: '-1', offset: '0' })
      .reply(200, ALIASES);

    robot = await support.createRobot({ httpd: true, alias: '!' });
    ['error', 'warn', 'info', 'debug'].forEach(function (level) {
      robot.logger[level] = function (msg) { logs.push(msg); };
    });

    stop = await support.freshStackstorm()(robot);
    await support.loadHelp(robot);
    user = robot.brain.userForId("1", { name: "mocha", room: "#mocha" });

    // aliases load asynchronously after start()
    for (var i = 0; i < 50 && !logs.some(function (l) { return / commands are loaded$/.test(l); }); i++) {
      await new Promise(function (resolve) { setTimeout(resolve, 20); });
    }
  });

  after(function() {
    stop && stop();
    robot && robot.shutdown();
    nock.cleanAll();
    restore_env && restore_env();
  });

  it("loads the StackStorm aliases", function() {
    var loaded = logs.filter(function (l) { return / commands are loaded$/.test(l); });
    expect(loaded).to.have.length(1);
    expect(parseInt(loaded[0], 10)).to.be.at.least(ALIASES.length);
  });

  it("lists the aliases when asked for help", async function() {
    var sent = new Promise(function (resolve) {
      robot.adapter.once("send", function (envelope, strings) { resolve(strings.join('\n')); });
    });
    await support.say(robot, user, "!help");

    // hubot 14 keeps help in robot.helpStrings: the alias must be there, not only hubot-help's own
    var help = await sent;
    expect(help).to.contain('!alias1 fmt1 {{param}} breaking words {{param2=default}} - alias1');
    expect(help).to.contain('!help - Displays all of the help commands');
  });

  it("has listeners", function() {
    // hubot-stackstorm's catch-all and hubot-help's
    expect(robot.listeners).to.have.length(2);
  });

  it("doesn't have two-factor auth enabled by default", function() {
    expect(logs).not.to.contain('Two-factor auth is enabled');
  });
});
