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

var fs = require('fs'),
    expect = require("chai").expect,
    path = require("path"),
    CommandFactory = require('../src/lib/command_factory.js'),
    formatCommand = require('../src/lib/format_command.js'),
    utils = require('../src/lib/utils.js');

var ALIAS_FIXTURES = fs.readFileSync('test/fixtures/aliases.json');
ALIAS_FIXTURES = JSON.parse(ALIAS_FIXTURES);

var disableLogger = true,
    logs = [],
    controlledLogger = function(msg) { logs.push(msg); };

var enableTwofactor = function() {
  process.env.HUBOT_2FA = 'somepack.twofactor_action';
};

describe("two-factor auth module", async function() {
  var hubot_import = await import("hubot/index.mjs");
  var TextMessage = new hubot_import.TextMessage;
  var robot, user, adapter, st2bot, stop, command_factory;

  before( async function(done) {
    robot = new hubot_import.Robot("mock-adapter", true, "Hubot");

    // Hack. Need a better solution than stubbing out methods.
    if (disableLogger) {
      robot.logger.error = controlledLogger;
      robot.logger.warning = controlledLogger;
      robot.logger.info = controlledLogger;
      robot.logger.debug = controlledLogger;
    }

    enableTwofactor();

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
        command_factory = new CommandFactory(robot);
        ALIAS_FIXTURES.forEach(function(alias) {
          command_factory.addCommand(
            formatCommand(null, alias.name, alias.formats[0], alias.description),
            alias.name,
            alias.formats[0],
            alias);
        });
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
    logs = [];
  });

  it("is fired up when an alias has `extra:security:twofactor`", function() {
    expect(utils.enable2FA(ALIAS_FIXTURES[4])).to.be.ok;
  });

  it("is not fired up when an alias has no `extra:security:twofactor`", function() {
    expect(utils.enable2FA(ALIAS_FIXTURES[0])).to.be.not.ok;
    expect(utils.enable2FA(ALIAS_FIXTURES[1])).to.be.not.ok;
    expect(utils.enable2FA(ALIAS_FIXTURES[2])).to.be.not.ok;
    expect(utils.enable2FA(ALIAS_FIXTURES[3])).to.be.not.ok;
  });

});
