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
/*global describe, it*/
"use strict";

var chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  utils = require('../lib/utils.js'),
  env = process.env;

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

describe('parseUrl', function() {
  it('should correctly parse values', function() {
    var result = utils.parseUrl('http://www.example.com/a');
    expect(result['hostname']).to.be.equal('www.example.com');
    expect(result['protocol']).to.be.equal('http');
    expect(result['port']).to.be.equal(80);
    expect(result['path']).to.be.equal('/a');
  });

  it('should correctly parse ports', function() {
    var result = utils.parseUrl('http://www.example.com:8080');
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


describe('getTextChunks', function() {
  it('should split strings based on length', function() {
    var result = utils.getTextChunks("12345678909876543210", 10);
    expect(result).to.be.an.instanceOf(Array);
    expect(result).to.have.lengthOf(2);
    expect(result[0]).to.be.equal("1234567890");
    expect(result[1]).to.be.equal("9876543210");
  });

  it('should raggedly split strings based on length', function() {
    var result = utils.getTextChunks("12345678909876543210ABCDE", 10);
    expect(result).to.be.an.instanceOf(Array);
    expect(result).to.have.lengthOf(3);
    expect(result[0]).to.be.equal("1234567890");
    expect(result[1]).to.be.equal("9876543210");
    expect(result[2]).to.be.equal("ABCDE");
  });

  it('should return an empty array when given an empty string', function () {
    var result = utils.getTextChunks("", 111);
    expect(result).to.be.an.instanceOf(Array);
    expect(result).to.have.lengthOf(0);
    expect(result).to.have.same.members([]);
  });
});


describe('constructFromAttrs', function() {
  it('should construct a new object', function () {
    var result = utils.constructFromAttrs(
      {from: "FROM", to: "TO"},
      ['from', 'shouldnt_error']);
    expect(result).to.have.property('from', 'FROM');
    expect(result).to.not.have.property('shouldnt_error');
  });
});


describe('getExecutionHistoryUrl', function() {
  var execution_model = {
    'action': {
      'name': 'pointlessaction',
      'runner_type': 'pointlessrunner'
    },
    'children': [
      '54e657f20640fd16887d6857',
      '54e658290640fd16887d685a'
    ],
    'end_timestamp': '2014-09-01T00:00:59.000000Z',
    'id': '54e657d60640fd16887d6855',
    'liveaction': {
      'action': 'pointlessaction'
    },
    'runner': {
      'name': 'pointlessrunner',
      'runner_module': 'no.module'
    },
    'start_timestamp': '2014-09-01T00:00:01.000000Z',
    'status': 'succeeded',
    'web_url': 'https://webui.yolocompany.com/#/history/54e657d60640fd16887d6855/general'
  };

  it('should return url from model', function() {
    var web_url = utils.getExecutionHistoryUrl(execution_model);
    expect(web_url).to.be.equal(
      'https://webui.yolocompany.com/#/history/54e657d60640fd16887d6855/general'
    );
  });

  it('should return null from false execution ID', function() {
    var input = {
      web_url: false,
      id: false
    };
    var old_ST2_WEBUI_URL = env.ST2_WEBUI_URL;
    env.ST2_WEBUI_URL = 'https://webui.yolocompany.com/#/history/54e657d60640fd16887d6855/general';
    var web_url = utils.getExecutionHistoryUrl(input);
    expect(web_url).to.be.null;
    env.ST2_WEBUI_URL = old_ST2_WEBUI_URL;
  });

  it('should return null from null execution ID', function() {
    var input = {
      web_url: false,
      id: null
    };
    var old_ST2_WEBUI_URL = env.ST2_WEBUI_URL;
    env.ST2_WEBUI_URL = 'https://webui.yolocompany.com/#/history/54e657d60640fd16887d6855/general';
    var web_url = utils.getExecutionHistoryUrl(input);
    expect(web_url).to.be.null;
    env.ST2_WEBUI_URL = old_ST2_WEBUI_URL;
  });

  it('should return null from undefined execution ID', function() {
    var input = {
      web_url: false,
      id: undefined
    };
    var old_ST2_WEBUI_URL = env.ST2_WEBUI_URL;
    env.ST2_WEBUI_URL = 'https://webui.yolocompany.com/#/history/54e657d60640fd16887d6855/general';
    var web_url = utils.getExecutionHistoryUrl(input);
    expect(web_url).to.be.null;
    env.ST2_WEBUI_URL = old_ST2_WEBUI_URL;
  });

  it('should return null from no ST2_WEBUI_URL environment variable', function() {
    var input = {
      web_url: false,
      id: "54e657d60640fd16887d6855"
    };
    var old_ST2_WEBUI_URL = env.ST2_WEBUI_URL;
    env.ST2_WEBUI_URL = 'null';
    var web_url = utils.getExecutionHistoryUrl(input);
    expect(web_url).to.be.null;
    env.ST2_WEBUI_URL = old_ST2_WEBUI_URL;
  });

  // Backward compatibility. Remove this test when we deprecate ST2_WEB_URL env variable.
  it('should return url from env if web_url is not present', function() {
    var web_url;
    var web_url_bkup = execution_model.web_url;

    process.env.ST2_WEBUI_URL = 'https://hostname-set-in-env';
    delete execution_model['web_url'];

    web_url = utils.getExecutionHistoryUrl(execution_model);
    expect(web_url).to.be.equal(
      'https://hostname-set-in-env/#/history/54e657d60640fd16887d6855/general'
    );

    execution_model.web_url = web_url_bkup;
  });
});
