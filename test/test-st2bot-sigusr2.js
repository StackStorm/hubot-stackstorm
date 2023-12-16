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

describe("SIGUSR2", function () {
  var robot = new Robot(null, "mock-adapter", false, "Hubot");
  robot.logger = new Logger(true);
  var debug_spy = sinon.spy(robot.logger, 'debug'),
    info_spy = sinon.spy(robot.logger, 'info');

  // Not required for SIGUSR2 to work, but mocking the response increases code
  // coverage and more closely approximates the real world
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
          "enabled": true,
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
        }
      ]);
  });

  afterEach(function() {
    info_spy.resetHistory();
    debug_spy.resetHistory();
    nock.cleanAll();
    // Remove stackstorm.js from the require cache
    // https://medium.com/@gattermeier/invalidate-node-js-require-cache-c2989af8f8b0
    delete require.cache[require.resolve("../src/stackstorm.js")];
  });

  it("should run loadCommands() after receiving signal", function (done) {
    // Load script under test
    var stackstorm = require("../src/stackstorm.js");
    stackstorm(robot).then(function (stop) {
      expect(debug_spy).to.have.callCount(1);
      expect(debug_spy).to.have.been.calledWith('Using default adapter');
      process.emit('SIGUSR2');
      expect(debug_spy).to.have.callCount(2);
      expect(debug_spy).to.have.been.calledWith('Caught SIGUSR2, reloading commands');
      expect(info_spy.args).to.have.length.above(1);
      expect(info_spy).to.have.been.calledWith('Loading commands....');

      stop();

      done();
    }).catch(function (err) {
      console.log(err);
      stop && stop();
      done(err);
    });
  });
});
