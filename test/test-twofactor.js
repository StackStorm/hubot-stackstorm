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
"use strict";

var expect = require("chai").expect,
    mockedEnv = require('mocked-env'),
    utils = require('../src/lib/utils.js');

var ALIAS_FIXTURES = require('./fixtures/aliases.json');

describe("two-factor auth module", function() {
  var restore_env;

  // two-factor auth only applies when HUBOT_2FA names the action that confirms it
  before(function() {
    restore_env = mockedEnv({ HUBOT_2FA: 'somepack.twofactor_action' }, { clear: false });
  });

  after(function() {
    restore_env && restore_env();
  });

  it("is fired up when an alias has `extra:security:twofactor`", function() {
    expect(utils.enable2FA(ALIAS_FIXTURES[4])).to.be.ok;
  });

  it("is not fired up when an alias has no `extra:security:twofactor`", function() {
    expect(utils.enable2FA(ALIAS_FIXTURES[0])).to.be.not.ok;
    expect(utils.enable2FA(ALIAS_FIXTURES[1])).to.be.not.ok;
    expect(utils.enable2FA(ALIAS_FIXTURES[2])).to.be.not.ok;
    expect(utils.enable2FA(ALIAS_FIXTURES[3])).to.be.not.ok;
  });
});
