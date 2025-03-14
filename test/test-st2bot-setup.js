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
  path = require("path");

var disableLogger = true,
    logs = [],
    controlledLogger = function(msg) { logs.push(msg); };

var disableAuth = function() {
  process.env.ST2_AUTH_URL = '';
  process.env.ST2_AUTH_USERNAME = '';
  process.env.ST2_AUTH_PASSWORD = '';
};

describe("stanley the StackStorm bot", async function() {
  var hubot_import = await import("hubot/index.mjs");

  var robot, user, adapter, st2bot, stop;

  before( async function(done) {
    robot = new hubot_import.Robot("mock-adapter", true, "Hubot");
    var TextMessage = new hubot_import.TextMessage;

    // Hack. Need a better solution than stubbing out methods.
    if (disableLogger) {
      robot.logger.error = controlledLogger;
      robot.logger.warning = controlledLogger;
      robot.logger.info = controlledLogger;
      robot.logger.debug = controlledLogger;
    }

    disableAuth();

    robot.adapter.on("connected", function() {

      // Load script under test
      st2bot = require("../src/stackstorm");

      st2bot(robot).then(function(result) {
        stop = result;
        // Load help module
        robot.loadFile(path.resolve('node_modules', 'hubot-help', 'src'), 'help.coffee');

        user = robot.brain.userForId("1", {
          name: "mocha",
          room: "#mocha"
        });

        adapter = robot.adapter;
        done();
      }).catch(function(err) {
        console.log(err);
        done(err);
      });
    });

    robot.run();
  });

  after(function() {
    stop && stop();
    if (robot) {
      robot.shutdown();
      if (robot.server) {
        robot.server.close();
      }
    }
  });

  it("responds when asked for help", function(done) {
    adapter.on("send", function(envelope, strings) {
      expect(strings[0]).to.be.a('string');
      done();
    });
    adapter.receive(new TextMessage(user, "Hubot help"));
  });

  it("has listeners", function() {
    expect(robot.listeners).to.have.length(2);
  });

  it("doesn't have two-factor auth enabled by default", function() {
    expect(logs).not.to.contain('Two-factor auth is enabled');
  });

});
