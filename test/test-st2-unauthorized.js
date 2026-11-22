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

var chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai').default,  // an ES module since sinon-chai 4
  nock = require('nock').default,  // an ES module since nock 14
  mockedEnv = require('mocked-env'),
  Logger = require('./dummy-logger.js'),
  support = require('./support/robot.js');

chai.use(sinonChai);

describe("auth with invalid st2 API key", function() {
  var robot, stop, restore_env, recordedError = null, mochaHandlers;

  before(async function() {
    restore_env = mockedEnv({ ST2_API_KEY: 'aaaa' });

    nock('http://localhost:9101')
      .get('/v1/actionalias')
      .query({ limit: '-1', offset: '0' })
      .reply(401, { "faultstring": "Unauthorized - ApiKey with key_hash=123 not found." });
    nock('http://localhost:9102')
      .get('/v1/stream')
      .query(true)
      .reply(401, "");

    // A rejected key is unrecoverable: the error is rethrown until it is uncaught and the process
    // exits (the service manager restarts it). Catch it here instead of letting mocha see it.
    mochaHandlers = process.listeners('uncaughtException');
    process.removeAllListeners('uncaughtException');
    process.once('uncaughtException', function (error) { recordedError = error; });

    robot = await support.createRobot({ httpd: true });
    robot.logger = new Logger(true);
    ['error', 'info', 'debug'].forEach(function (level) { sinon.spy(robot.logger, level); });

    stop = await support.freshStackstorm()(robot);
    for (var i = 0; i < 100 && !recordedError; i++) {
      await new Promise(function (resolve) { setTimeout(resolve, 20); });
    }
  });

  after(function() {
    process.removeAllListeners('uncaughtException');
    mochaHandlers.forEach(function (handler) { process.on('uncaughtException', handler); });
    stop && stop();
    robot && robot.shutdown();
    nock.cleanAll();
    restore_env && restore_env();
  });

  it("is using ST2_API_KEY as authentication", function () {
    expect(robot.logger.info).to.have.been.calledWith('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
  });

  it("fails to retrieve the commands from API", function () {
    expect(robot.logger.error).to.have.been.calledWith('Failed to retrieve commands from "http://localhost:9101": Unauthorized - ApiKey with key_hash=123 not found.');
  });

  it("throws the 'Unauthorized' error until it is uncaught", function () {
    expect(recordedError).to.include({
      name: "APIError",
      status: 401,
      message: "Unauthorized - ApiKey with key_hash=123 not found."
    });
  });

  it("shuts hubot down on errors hubot reports", function () {
    robot.emit('error', new Error('boom'));
    expect(robot.logger.info).to.have.been.calledWith('Hubot will shut down ...');
  });
});
