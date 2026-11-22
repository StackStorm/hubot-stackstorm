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
/*global describe, it, before, after, beforeEach, afterEach*/
'use strict';

var chai = require("chai"),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai').default,  // an ES module since sinon-chai 4
  nock = require('nock').default,  // an ES module since nock 14
  mockedEnv = require('mocked-env'),
  Logger = require('./dummy-logger.js'),
  support = require('./support/robot.js');

chai.use(sinonChai);

describe("environment variable configuration", function () {
  var robot, restore_env = null, stop = null;

  before(async function () {
    robot = await support.createRobot();
    robot.logger = new Logger(true);
    ['debug', 'info', 'error'].forEach(function (level) { sinon.spy(robot.logger, level); });
  });

  beforeEach(function () {
    nock('http://localhost:9101').get('/v1/actionalias').query(true).reply(200, []);
  });

  afterEach(function () {
    stop && stop();
    stop = null;
    restore_env && restore_env();
    nock.cleanAll();
    ['debug', 'info', 'error'].forEach(function (level) { robot.logger[level].resetHistory(); });
  });

  after(function () {
    robot && robot.shutdown();
  });

  it("logs that ST2_API is deprecated when it is used", async function () {
    restore_env = mockedEnv({
      ST2_API: 'http://localhost:9101',
      ST2_API_KEY: 'test-key'
    });

    stop = await support.freshStackstorm()(robot);

    expect(robot.logger.error).to.have.been.calledWith(
      'ST2_API is deprecated and will be removed in a future releases. Instead, please use the '+
      'ST2_API_URL environment variable.');
  });

  it("logs that two-factor auth is on when HUBOT_2FA is used", async function () {
    restore_env = mockedEnv({
      ST2_API_KEY: 'test-key',
      HUBOT_2FA: 'true'
    });

    stop = await support.freshStackstorm()(robot);

    expect(robot.logger.info).to.have.been.calledWith('Two-factor auth is enabled');
  });
});
