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

describe("SIGUSR2", function () {
  var robot, stop, restore_env;

  before(async function () {
    restore_env = mockedEnv({ ST2_API_KEY: 'test-key' });
    // the initial load, then the reload the signal asks for
    nock('http://localhost:9101')
      .get('/v1/actionalias')
      .times(2)
      .query({ limit: '-1', offset: '0' })
      .reply(200, [{
        "name": "hello",
        "description": "long hello",
        "enabled": true,
        "formats": [
          { "display": "format_one", "representation": "format_one" },
          { "display": "format_two", "representation": "format_two" }
        ]
      }]);

    robot = await support.createRobot();
    robot.logger = new Logger(true);
    sinon.spy(robot.logger, 'debug');
    sinon.spy(robot.logger, 'info');
    stop = await support.freshStackstorm()(robot);
  });

  after(function () {
    stop && stop();
    robot && robot.shutdown();
    nock.cleanAll();
    restore_env && restore_env();
  });

  it("reloads the commands when it receives the signal", function () {
    expect(robot.logger.debug).to.have.been.calledWith('Using default adapter');
    robot.logger.debug.resetHistory();
    robot.logger.info.resetHistory();

    process.emit('SIGUSR2');

    expect(robot.logger.debug).to.have.been.calledWith('Caught SIGUSR2, reloading commands');
    expect(robot.logger.info).to.have.been.calledWith('Loading commands....');
  });
});
