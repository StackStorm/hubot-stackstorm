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

// needed to get all coffeescript modules to be loaded
require('coffee-script/register');

var expect = require("chai").expect,
  path = require("path"),
  Robot = require("hubot/src/robot"),
  TextMessage = require("hubot/src/message").TextMessage;

var disableLogger = true,
  controlledLogger = function(msg) {};

describe("stanley the StackStorm bot", function() {
  var robot, user, adapter, st2bot, commands_load_interval;

  before(function(done) {
    robot = new Robot(null, "mock-adapter", true, "Hubot");

    // Hack. Need a better solution than stubbing out methods.
    if (disableLogger) {
      robot.logger.error = controlledLogger;
      robot.logger.warn = controlledLogger;
      robot.logger.info = controlledLogger;
      robot.logger.debug = controlledLogger;
    }

    robot.adapter.on("connected", function() {

      // Load script under test
      st2bot = require("../scripts/stackstorm");

      st2bot(robot).then(function(result) {
        commands_load_interval = result;
        // Load help module
        robot.loadFile(path.resolve('node_modules', 'hubot-help', 'src'), 'help.coffee');

        user = robot.brain.userForId("1", {
          name: "mocha",
          room: "#mocha"
        });

        adapter = robot.adapter;
        done();
      }).catch(function(err) {
        done();
      });
    });

    robot.run();
  });

  after(function(done) {
    clearInterval(commands_load_interval);
    robot.server.close();
    robot.shutdown();
    done();
  });

  it("responds when asked for help", function(done) {
    adapter.on("send", function(envelope, strings) {
      expect(strings[0]).to.be.an('string');
      done();
    });
    adapter.receive(new TextMessage(user, "Hubot help"));
  });

  it("has listeners", function(done) {
    expect(robot.listeners).to.have.length(2);
    done();
  });

  it("has the right environment variables", function(done) {
    expect(process.env.ST2_API).to.exist;
    expect(process.env.ST2_CHANNEL).to.exist;
    expect(process.env.ST2_COMMANDS_RELOAD_INTERVAL).to.exist;
    done();
  });
});
