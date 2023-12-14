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
  chaiString = require("chai-string"),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  chaiAsPromised = require('chai-as-promised'),
  mockedEnv = require('mocked-env'),
  Robot = require("hubot/src/robot"),
  Logger = require('./dummy-logger.js');

chai.use(sinonChai);
chai.use(chaiString);
chai.use(chaiAsPromised);

global.process.exit = sinon.spy();

describe("invalid st2 credential configuration", function() {
  var robot = new Robot(null, false, "mock-adapter", "Hubot");
  robot.setupNullRouter();
  robot.logger = new Logger(true);
  var restore_env = null,
    info_spy = sinon.spy(robot.logger, 'info'),
    error_spy = sinon.spy(robot.logger, 'error');

  beforeEach(function () {
    process.exit.resetHistory();
  });

  afterEach(function() {
    restore_env && restore_env();
    error_spy.resetHistory();
    info_spy.resetHistory();
    // Remove stackstorm.js from the require cache
    // https://medium.com/@gattermeier/invalidate-node-js-require-cache-c2989af8f8b0
    delete require.cache[require.resolve("../src/stackstorm.js")];
    delete require.cache[require.resolve("../src/lib/stackstorm_api.js")];
  });

  it("should error out with missing auth URL", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    // Load script under test
    var stackstorm = require("../src/stackstorm.js");
    console.log("past the require")
    expect(stackstorm.bind(this, robot)).to.throw("Env variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD and ST2_AUTH_URL should only be used together.");
    done();
  });

  it("should error out with missing auth username", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    // Load script under test
    var stackstorm = require("../src/stackstorm.js");
    expect(stackstorm.bind(this, robot)).to.throw("Env variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD and ST2_AUTH_URL should only be used together.");
    done();
  });


  it("should error out with missing auth password", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url',
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username'
    });

    // Load script under test
    var stackstorm = require("../src/stackstorm.js");
    expect(stackstorm.bind(this, robot)).to.throw("Env variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD and ST2_AUTH_URL should only be used together.");
    done();
  });

  it("should throw exception with bad auth URL", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url:9101',
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    // Load script under test
    var i, stackstorm = require("../src/stackstorm.js");
    stackstorm(robot).then(function (result) {
      done(new Error("The previous code should have thrown an exception"));
    }).catch(function (err) {
      console.log("in the catch")
      expect(error_spy.args).to.have.lengthOf(1);
      expect(error_spy.args[0][0]).to.be.a('string');
      expect(error_spy.args[0][0]).to.startWith('Failed to authenticate');

      // On Mac, this is:
      // getaddrinfo ENOTFOUND nonexistent-st2-auth-url nonexistent-st2-auth-url:9101
      // But on Linux, it is:
      // 
      // So instead of using basic string comparison, we use a regex and check for common substrings
      // On later node versions then just seeing
      // getaddrinfo ENOTFOUND nonexistent-st2-auth-url
      // getaddrinfo EAI_AGAIN nonexistent-st2-auth-url seen on Github Actions.
      expect(err.message).to.match(/getaddrinfo (ENOTFOUND|EAI_AGAIN) nonexistent-st2-auth-url/);

      done();
    });
  });
});
