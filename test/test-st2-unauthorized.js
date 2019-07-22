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
  sinonChai = require('sinon-chai'),
  nock = require('nock'),
  Robot = require('hubot/src/robot'),
  Logger = require('./dummy-logger.js');

chai.use(sinonChai);

describe("auth with invalid st2 API key", function() {
  var stop;
  var robot = new Robot(null, "mock-adapter", true, "Hubot");
  robot.logger = new Logger(true);
  var recordedError = null,
    error_spy = sinon.spy(robot.logger, 'error'),
    warning_spy = sinon.spy(robot.logger, 'warning'),
    info_spy = sinon.spy(robot.logger, 'info'),
    debug_spy = sinon.spy(robot.logger, 'debug');

  before(function(done) {
    process.env.ST2_API_KEY = 'aaaa';

    // emulate ST2 API response
    nock('http://localhost:9101')
      .get('/v1/actionalias')
      .query({"limit":"-1","offset":"0"})
      .reply(401, {"faultstring":"Unauthorized - ApiKey with key_hash=123 not found."});

    // emulate ST2 STREAM response
    nock('http://localhost:9102')
      .get('/v1/stream')
      .query({"st2-api-key":"aaa"})
      .reply(401, "");

    // hack to detect uncaught exceptions
    var originalException = process.listeners('uncaughtException').pop();
    process.removeListener('uncaughtException', originalException);
    process.prependOnceListener('uncaughtException', function (error) {
      process.listeners('uncaughtException').push(originalException);
      recordedError = error;
      //done();
    });

    // Remove stackstorm.js from the require cache
    // https://medium.com/@gattermeier/invalidate-node-js-require-cache-c2989af8f8b0
    delete require.cache[require.resolve("../src/stackstorm.js")];
    delete require.cache[require.resolve("../src/stackstorm_api.js")];
    var stackstorm = require("../src/stackstorm.js");
    stackstorm(robot).then(function (result) {
      stop = result;
      done();
    });
    robot.run();
  });

  after(function() {
    stop && stop();
    robot.server.close();
    robot.shutdown();
    // Remove stackstorm.js from the require cache
    // https://medium.com/@gattermeier/invalidate-node-js-require-cache-c2989af8f8b0
    delete require.cache[require.resolve("../src/stackstorm.js")];
    delete require.cache[require.resolve("../src/stackstorm_api.js")];
  });

  // CAUTION: These tests are brittle - do not move them around, remove
  //          intermediate tests, or combine expects/assertions
  // TODO: Come back and fix this properly
  it("is using ST2_API_KEY as authentication", function () {
    // debug, if needed
    //console.log(logs);
    expect(info_spy).to.have.been.calledWith('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
  });

  it("fails to retrieve the commands from API", function () {
    expect(error_spy).to.have.been.calledWith('Failed to retrieve commands from "http://localhost:9101": Unauthorized - ApiKey with key_hash=123 not found.');
  });

  it("throws an 'Unauthorized' error", function () {
    expect(recordedError).to.be.deep.equal(
      {
        "name": "APIError",
        "status": 401,
        "message": "Unauthorized - ApiKey with key_hash=123 not found."
      }
    );
  });

  it("leads to Hubot shutdown", function () {
    expect(info_spy).to.have.been.calledWith('Hubot will shut down ...');
  });
});
