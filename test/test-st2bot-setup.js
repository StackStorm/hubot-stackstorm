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

// needed to get all coffeescript modules to be loaded
require('coffee-register');

var expect = require("chai").expect,
  path = require("path"),
  Robot = require("hubot/src/robot"),
  TextMessage = require("hubot/src/message").TextMessage;

var disableLogger = true,
    logs = [],
    controlledLogger = function(msg) { logs.push(msg); };

var disableAuth = function() {
  process.env.ST2_AUTH_URL = '';
  process.env.ST2_AUTH_USERNAME = '';
  process.env.ST2_AUTH_PASSWORD = '';
};

describe("stanley the StackStorm bot", function() {
  var robot, user, adapter, st2bot, stop;

  before(function(done) {
    robot = new Robot(null, "mock-adapter", true, "Hubot");
    // robot.setupNullRouter();
    // robot.loadAdapter("shell");

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
    robot.server.close();
    robot.shutdown();
  });

  it("responds when asked for help", function(done) {

    adapter.on("send", function(envelope, strings) {
      console.log(strings)
      console.log(envelope)
      expect(strings[0]).to.be.a('string');
      done();
    });
    console.log(adapter)
    console.log(robot.middleware)
    console.log(robot.listeners)
    adapter.receive(new TextMessage(user, "Hubot help"));
  });

  it("has listeners", function() {
    expect(robot.listeners).to.have.length(2);
  });

  it("doesn't have two-factor auth enabled by default", function() {
    expect(logs).not.to.contain('Two-factor auth is enabled');
  });

});
