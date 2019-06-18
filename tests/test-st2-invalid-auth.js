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
  var robot = new Robot(null, "mock-adapter", false, "Hubot");
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
    delete require.cache[require.resolve("../scripts/stackstorm.js")];
  });

  it("should error out with missing auth URL", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    // Load script under test
    var stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).then(function () {
      expect(error_spy).to.have.been.calledTwice;
      expect(error_spy.firstCall.args[0]).to.be.equal(
        'Environment variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD, and ST2_AUTH_URL '+
        'must all be specified together.');
      expect(error_spy.secondCall.args[0]).to.be.equal('Missing: ST2_AUTH_URL');

      done();
    }).catch(function (err) {
      console.log(err);
      done(err);
    });
  });

  it("should error out with missing auth username", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    // Load script under test
    var stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).then(function () {
      expect(error_spy).to.have.been.calledTwice;
      expect(error_spy.firstCall.args[0]).to.be.equal(
        'Environment variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD, and ST2_AUTH_URL '+
        'must all be specified together.');
      expect(error_spy.secondCall.args[0]).to.be.equal('Missing: ST2_AUTH_USERNAME');

      done();
    }).catch(function (err) {
      console.log(err);
      done(err);
    });
  });


  it("should error out with missing auth password", function(done) {
    // Mock process.env for all modules
    // https://glebbahmutov.com/blog/mocking-process-env/
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url',
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username'
    });

    // Load script under test
    var stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).then(function () {
      expect(error_spy).to.have.been.calledTwice;
      expect(error_spy.firstCall.args[0]).to.be.equal(
        'Environment variables ST2_AUTH_USERNAME, ST2_AUTH_PASSWORD, and ST2_AUTH_URL '+
        'must all be specified together.');
      expect(error_spy.secondCall.args[0]).to.be.equal('Missing: ST2_AUTH_PASSWORD');

      done();
    }).catch(function (err) {
      console.log(err);
      done(err);
    });
  });

  it("should throw exception with bad auth URL", function(done) {
    restore_env = mockedEnv({
      ST2_AUTH_URL: 'https://nonexistent-st2-auth-url:9101',
      ST2_AUTH_USERNAME: 'nonexistent-st2-auth-username',
      ST2_AUTH_PASSWORD: 'nonexistent-st2-auth-password'
    });

    // Load script under test
    var i, stackstorm = require("../scripts/stackstorm.js");
    stackstorm(robot).catch(function (err) {
      expect(error_spy.args).to.have.lengthOf(1);
      expect(error_spy.args[0][0]).to.be.a('string');
      expect(error_spy.args[0][0]).to.equal('Failed to authenticate with st2 username and password.');

      expect(err.message).to.match(/getaddrinfo [A-Z]+ nonexistent-st2-auth-url nonexistent-st2-auth-url:9101/);

      done();
    });
  });

  it("should raise exception with bad API key", function(done) {
    restore_env = mockedEnv({
      ST2_API_KEY: 'aaa'
    });

    // Load script under test
    var i, stackstorm = require("../scripts/stackstorm.js");

    expect(stackstorm(robot)).to.be.rejectedWith(Error, /connect [A-Z]+ 127\.0\.0\.1:9101/).notify(done);

    expect(info_spy).to.have.been.calledOnceWith('Using ST2_API_KEY as authentication. Expiry will lead to bot exit.');
  });

  it("should raise exception with bad auth token", function(done) {
    restore_env = mockedEnv({
      ST2_AUTH_TOKEN: 'aaa'
    });

    // Load script under test
    var i, stackstorm = require("../scripts/stackstorm.js");

    expect(stackstorm(robot)).to.be.rejectedWith(Error, /connect [A-Z]+ 127\.0\.0\.1:9101/).notify(done);

    expect(info_spy).to.have.been.calledOnceWith('Using ST2_AUTH_TOKEN as authentication. Expiry will lead to bot exit.');
  });
});
