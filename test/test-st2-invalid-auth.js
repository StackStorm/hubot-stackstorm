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
/*global describe, it, before, after, afterEach*/
'use strict';

var chai = require("chai"),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai').default,  // an ES module since sinon-chai 4
  mockedEnv = require('mocked-env'),
  Logger = require('./dummy-logger.js'),
  support = require('./support/robot.js');

chai.use(sinonChai);

describe("invalid st2 credential configuration", function() {
  var robot, restore_env = null;
  var TOGETHER = "Env variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD and ST2_AUTH_URL should only be used together.";

  before(async function () {
    robot = await support.createRobot();
    robot.logger = new Logger(true);
    sinon.spy(robot.logger, 'info');
    sinon.spy(robot.logger, 'error');
  });

  afterEach(function() {
    restore_env && restore_env();
    robot.logger.error.resetHistory();
    robot.logger.info.resetHistory();
  });

  after(function () {
    robot && robot.shutdown();
  });

  it("should error out with missing auth URL", function() {
    restore_env = mockedEnv({
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    var stackstorm = support.freshStackstorm();
    expect(function () { stackstorm(robot); }).to.throw(TOGETHER);
  });

  it("should error out with missing auth username", function() {
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    var stackstorm = support.freshStackstorm();
    expect(function () { stackstorm(robot); }).to.throw(TOGETHER);
  });

  it("should error out with missing auth password", function() {
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url',
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username'
    });

    var stackstorm = support.freshStackstorm();
    expect(function () { stackstorm(robot); }).to.throw(TOGETHER);
  });

  it("should reject with a bad auth URL", async function() {
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url:9101',
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    var err = await support.freshStackstorm()(robot).then(
      function () { throw new Error("authentication should have failed"); },
      function (e) { return e; });

    expect(robot.logger.error).to.have.callCount(1);
    expect(robot.logger.error.args[0][0]).to.match(/^Failed to authenticate/);
    // ENOTFOUND, or EAI_AGAIN where DNS isn't reachable (CI)
    expect(err.message).to.match(/getaddrinfo (ENOTFOUND|EAI_AGAIN) nonexistent-st2-auth-url/);
  });
});
