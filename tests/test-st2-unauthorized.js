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
'use strict';

var chai = require('chai'),
  expect = chai.expect,
  nock = require('nock'),
  Robot = require('hubot/src/robot');

describe("auth with invalid st2 API key", function() {
  var stop;
  var robot = new Robot(null, "mock-adapter", true, "Hubot");
  var recordedError = null,
    logs = [],
    controlledLogger = function(msg) { logs.push(msg); };

  robot.logger.error = controlledLogger;
  robot.logger.warning = controlledLogger;
  robot.logger.info = controlledLogger;
  robot.logger.debug = controlledLogger;


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

    var stackstorm = require("../scripts/stackstorm.js");
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
    delete require.cache[require.resolve("../scripts/stackstorm.js")];
  });


  it("is using ST2_API_KEY as authentication", function () {
    // debug, if needed
    //console.log(logs);
    expect(logs).to.contain('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
  });

  it("fails to retrieve the commands from API", function () {
    expect(logs).to.include('Failed to retrieve commands from "http://localhost:9101": Unauthorized - ApiKey with key_hash=123 not found.');
  });

  it("throws an 'Unauthorized' error", function () {
    expect(JSON.stringify(recordedError)).to.be.equal(
      '{"name":"APIError","status":401,"message":"Unauthorized - ApiKey with key_hash=123 not found."}'
    );
  });
  
  it("leads to Hubot shutdown", function () {
    expect(logs).to.contain('Hubot will shut down ...');
  });
});
