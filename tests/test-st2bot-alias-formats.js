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
/*global describe, it, afterEach*/
'use strict';

var chai = require("chai"),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  nock = require('nock'),
  Robot = require("hubot/src/robot"),
  Logger = require('./dummy-logger.js');

chai.use(sinonChai);

describe("loading alias formats", function () {
  var robot = new Robot(null, "mock-adapter", false, "Hubot");
  robot.logger = new Logger(true);
  var debug_spy = sinon.spy(robot.logger, 'debug'),
    info_spy = sinon.spy(robot.logger, 'info'),
    error_spy = sinon.spy(robot.logger, 'error');

  beforeEach(function () {
    // emulate ST2 API response
    nock('http://localhost:9101')
      .get('/v1/actionalias')
      .times(2)
      .query({"limit": "-1", "offset": "0"})
      .reply(200, [
        {
          "name": "hello",
          "description": "long hello",
          "enabled": false,
          "formats": [
            {
              "display": "format_one",
              "representation": "format_one"
            },
            {
              "display": "format_two",
              "representation": "format_two"
            }
          ]
        },
        {
          "name": "hello",
          "description": "long hello",
          "enabled": true,
          "formats": [
            "format_string_one",
            "format_string_two"
          ]
        },
        {
          "name": "hello3",
          "description": "long hello 3",
          "enabled": true,
          "formats": []
        }
      ]);
  });

  afterEach(function() {
    error_spy.resetHistory();
    info_spy.resetHistory();
    debug_spy.resetHistory();
    nock.cleanAll();
    // Remove stackstorm.js from the require cache
    // https://medium.com/@gattermeier/invalidate-node-js-require-cache-c2989af8f8b0
    delete require.cache[require.resolve("../scripts/stackstorm.js")];
  });

  it("should not throw an exception for disabled aliases", function (done) {
    // Load script under test
    var stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).catch(function (err) {
      stop && stop();
      done(err);
    }).then(function (stop) {
      stop();
      done();
    });
  });
});
