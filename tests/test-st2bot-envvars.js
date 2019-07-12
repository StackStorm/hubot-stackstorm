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
/*global describe, it, before, after, beforeEach, afterEach*/
'use strict';

var chai = require("chai"),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  mockedEnv = require('mocked-env'),
  Robot = require("hubot/src/robot"),
  Logger = require('./dummy-logger.js');

chai.use(sinonChai);

describe("environment variable configuration", function () {
  var robot = new Robot(null, "mock-adapter", false, "Hubot");
  robot.logger = new Logger(true);
  var restore_env = null,
    debug_spy = sinon.spy(robot.logger, 'debug'),
    info_spy = sinon.spy(robot.logger, 'info'),
    error_spy = sinon.spy(robot.logger, 'error');

  afterEach(function() {
    restore_env && restore_env();
    error_spy.resetHistory();
    info_spy.resetHistory();
    debug_spy.resetHistory();
    // Remove stackstorm.js from the require cache
    // https://medium.com/@gattermeier/invalidate-node-js-require-cache-c2989af8f8b0
    delete require.cache[require.resolve("../scripts/stackstorm.js")];
    if (robot) {
      robot.shutdown();
      if (robot.server) {
        robot.server.close();
      }
    }
  });

  it("should log a warning when ST2_API is used", function (done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_API: 'https://nonexistent-st2-auth-url:9101'
    });

    // Load script under test
    var stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).then(function (stop) {
      expect(robot.logger.logs.warning).to.have.length.above(0);
      expect(robot.logger.logs.warning).to.contain(
        'ST2_API is deprecated and will be removed in a future releases. Instead, please use the '+
        'ST2_API_URL environment variable.');

      stop();

      done();
    }).catch(function (err) {
      console.log(err);
      done(err);
    });
  });

  it("should log info when HUBOT_2FA is used", function (done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      HUBOT_2FA: 'true'
    });

    // Load script under test
    var stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).then(function (stop) {
      expect(info_spy.args).length.to.be.above(1);
      // expect(info_spy).to.have.been.calledWith('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
      expect(info_spy).to.have.been.calledWith('Two-factor auth is enabled');
      expect(info_spy).to.have.been.calledWith('Loading commands....');

      stop();

      done();
    }).catch(function (err) {
      console.log(err.message);
      done(err);
    });
  });
});
