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
/*global describe, it*/
"use strict";

var chai = require('chai'),
  chaiAsPromied = require('chai-as-promised'),
  env = process.env,
  nock = require('nock'),
  Robot = require('./dummy-robot.js'),
  rsvp = require('rsvp'),
  authenticate = require('../lib/st2_authenticate.js');

chai.use(chaiAsPromied);
nock.disableNetConnect();

var all = rsvp.all,
  assert = chai.assert,
  expect = chai.expect;

function getLogger() {
  var robot = new Robot(false);
  return robot.logger;
}

describe('st2 authentication', function() {
  it('should treat no username and password as auth disabled.', function() {
    var expected_response = {
      token: null
    };
    return expect(authenticate('', '', null, null, getLogger())).to.eventually.be.deep.equal(expected_response);
  });

  it('should require password if username is provided.', function() {
    return expect(authenticate('', '', 'stanley', null, null)).to.be.rejectedWith(
      'Both username and password must be provided to authenticate.');
  });

  it('should require username if password is provided.', function() {
    return expect(authenticate('', '', null, 'junk', null)).to.be.rejectedWith(
      'Both username and password must be provided to authenticate.');
  });

  it('should authenticate.', function() {
    var username = 'stanley',
      password = 'rocks',
      response = {token: 'some_token'};
    nock('http://test:9100/').post('/tokens').reply(201, response);

    var result = authenticate('http://test:9100/tokens', '', username, password, getLogger());

    return all([
      expect(result).to.eventually.be.an('object'),
      expect(result).to.eventually.be.deep.equal(response)
    ]);
  });

  it('should fail to authenticate.', function() {
    var username = 'stanley',
      password = 'rocks',
      response = {};
    nock('http://test:9100/').post('/tokens').reply(400, response);
    // adjust the env variable.
    env.ST2_AUTH_RETRY_INTERVAL = 0.001;
    var result = authenticate('http://test:9100/tokens', '', username, password, getLogger());
    return expect(result).to.be.rejected;
  });

  it('should eventually authenticate.', function() {
    var username = 'stanley',
      password = 'rocks',
      response = {token: 'some_token'};
    // Will fail 5 time and respond with a token the 6th. Btw, the ability of nock to do
    // this is absolutely incredible.
    nock('http://test:9100/').post('/tokens').times(5).reply(400, response);
    nock('http://test:9100/').post('/tokens').reply(201, response);
    env.ST2_AUTH_RETRY_INTERVAL = 0.001;

    var result = authenticate('http://test:9100/tokens', '', username, password, getLogger());

    return all([
      expect(result).to.eventually.be.an('object'),
      expect(result).to.eventually.be.deep.equal(response)
    ]);
  });

});
