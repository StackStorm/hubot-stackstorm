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

/*global describe, it, before, after*/
'use strict';

var chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai').default,  // an ES module since sinon-chai 4
  nock = require('nock').default,  // an ES module since nock 14
  mockedEnv = require('mocked-env'),
  Logger = require('./dummy-logger.js'),
  support = require('./support/robot.js');

chai.use(sinonChai);

describe("st2 API errors while loading commands", function() {
  var robot, stop, restore_env, unhandled = [];
  var onUnhandled = function (reason) { unhandled.push(reason); };

  before(async function() {
    restore_env = mockedEnv({ ST2_API_KEY: 'test-key' });
    // an error body without faultstring: st2client hands the parsed body over as the message
    nock('http://localhost:9101')
      .get('/v1/actionalias')
      .query(true)
      .reply(500, { error: 'upstream timed out' });
    process.prependListener('unhandledRejection', onUnhandled);

    robot = await support.createRobot();
    robot.logger = new Logger(true);
    sinon.spy(robot.logger, 'error');
    stop = await support.freshStackstorm()(robot);
    await new Promise(function (resolve) { setTimeout(resolve, 100); });
  });

  after(function() {
    process.removeListener('unhandledRejection', onUnhandled);
    stop && stop();
    robot && robot.shutdown();
    nock.cleanAll();
    restore_env && restore_env();
  });

  it("logs the error body and keeps running", function () {
    expect(robot.logger.error).to.have.been.calledWith(
      'Failed to retrieve commands from "http://localhost:9101": {"error":"upstream timed out"}');
    // a non-string message used to throw a TypeError here, which ended the process
    expect(unhandled).to.have.length(0);
  });
});
