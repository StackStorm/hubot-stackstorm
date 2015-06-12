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
  assert = chai.assert,
  expect = chai.expect,
  utils = require('../lib/utils.js');

var MOCK_MESSAGE = 'Action st2.sensors.list completed.\nstatus : succeeded \nexecution: 55701c8b0640fd53cdf4f08 \nresult :';

describe('isNull', function() {
  it('should detect null correctly', function() {
    var result;

    result = utils.isNull(null);
    expect(result).to.be.equal(true);
    result = utils.isNull('null');
    expect(result).to.be.equal(true);
    result = utils.isNull('blah');
    expect(result).to.be.equal(false);
  });
});

describe('getExecutionHistoryUrl', function() {
  it('should return null on empty ST2_WEBUI_URL', function() {
    process.env.ST2_WEBUI_URL = null;
    var result = utils.getExecutionHistoryUrl('abcd');
    expect(result).to.be.equal(null);
  });

  it('should return null on empty execution_id', function() {
    process.env.ST2_WEBUI_URL = 'http://localhost:8080';
    var result = utils.getExecutionHistoryUrl(null);
    expect(result).to.be.equal(null);
  });

  it('should return url when env variable and execution id are set', function() {
    process.env.ST2_WEBUI_URL = 'http://localhost:8080';
    var result = utils.getExecutionHistoryUrl('abcd');
    expect(result).to.be.equal('http://localhost:8080/#/history/abcd/general');
  });
});

describe('getExecutionIdFromMessage', function() {
  it('should return null on empty message', function() {
    var result = utils.getExecutionIdFromMessage(null);
    expect(result).to.be.equal(null);
  });

  it('should return null on no match', function() {
    var result = utils.getExecutionIdFromMessage('fooo');
    expect(result).to.be.equal(null);
  });

  it('should return execution id on match', function() {
    var result = utils.getExecutionIdFromMessage(MOCK_MESSAGE);
    console.log(result);
    expect(result).to.be.equal('55701c8b0640fd53cdf4f08');
  });
});

describe('parseUrl', function() {
  it('should correctly parse values', function() {
    var result = utils.parseUrl('http://www.example.com/a');
    expect(result['hostname']).to.be.equal('www.example.com');
    expect(result['protocol']).to.be.equal('http');
    expect(result['port']).to.be.equal(80);
    expect(result['path']).to.be.equal('/a');
  });

  it('should correctly parrse ports', function() {
    var result;

    result = utils.parseUrl('http://www.example.com:8080');
      expect(result['port']).to.be.equal(8080);

    result = utils.parseUrl('https://www.example.com:8181');
      expect(result['port']).to.be.equal(8181);
  });

  it('should use default http port on port not specified', function() {
    var result = utils.parseUrl('http://www.example.com/a');
    expect(result['protocol']).to.be.equal('http');
    expect(result['port']).to.be.equal(80);
  });

  it('should use default https port on port not specified', function() {
    var result = utils.parseUrl('https://www.example.com/a');
    expect(result['protocol']).to.be.equal('https');
    expect(result['port']).to.be.equal(443);
  });
});
