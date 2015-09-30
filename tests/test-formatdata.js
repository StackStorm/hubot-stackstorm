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
  expect = chai.expect,
  env = process.env,
  formatData = require('../lib/format_data.js'),
  DummyRobot = require('./dummy-robot.js');

env.ST2_MAX_MESSAGE_LENGTH = 500;

describe('SlackFormatter', function() {
  var adapterName = 'slack';

  it('should create a snippet for non-empty', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.formatData('DATA', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });

  it('should truncate text more than a certain length', function() {
    var org_max_length = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 10;
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.formatData('abcd efgh ijklm', null);
    env.ST2_MAX_MESSAGE_LENGTH = org_max_length;

    expect(o).to.be.an('string');
    expect(o).to.equal('```\nabcd efgh ...\n```');

  });

  it('should be an empty string for empty', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.formatData('', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should echo back recepient', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.formatRecepient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.normalizeCommand('run local \u201cuname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });

  it('should normalize command with special double quote', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.normalizeCommand('run remote \u201cuname -a" \u201clocalhost, 127.0.0.1"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote "uname -a" "localhost, 127.0.0.1"');
  });

  it('should normalize command with special single quote', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.normalizeCommand('run remote \u2018uname -a\' \u2018localhost, 127.0.0.1\'');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote \'uname -a\' \'localhost, 127.0.0.1\'');
  });

});

describe('HipChatFormatter', function() {
  var adapterName = 'hipchat';

  it('should echo back for non-empty', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.formatData('DATA', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('/code DATA');
  });

  it('should be an empty string for empty', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.formatData('', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should correctly format recepient', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    env.HUBOT_HIPCHAT_JID = '234x_y234@conf.hipchat.com';
    var o = formatter.formatRecepient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('234x_Estee@conf.hipchat.com');
  });

  it('should normalize command', function() {
    var formatter = formatData.getFormatter(adapterName, null);
    var o = formatter.normalizeCommand('run local "uname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });
});

describe('DefaultFormatter', function() {
  var adapterName = 'unknown';
  var robot = new DummyRobot('dummy', false);

  it('should create a snippet for non-empty', function() {
    var formatter = formatData.getFormatter(adapterName, robot);
    var o = formatter.formatData('DATA', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('DATA');
  });

  it('should truncate text more than a certain length', function() {
    var org_max_length = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 10;
    var formatter = formatData.getFormatter(adapterName, robot);
    var o = formatter.formatData('abcd efgh ijklm', null);
    env.ST2_MAX_MESSAGE_LENGTH = org_max_length;

    expect(o).to.be.an('string');
    expect(o).to.equal('abcd efgh ...');
  });

  it('should be an empty string for empty', function() {
    var formatter = formatData.getFormatter(adapterName, robot);
    var o = formatter.formatData('', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should echo back recepient', function() {
    var formatter = formatData.getFormatter(adapterName, robot);
    var o = formatter.formatRecepient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command', function() {
    var formatter = formatData.getFormatter(adapterName, robot);
    var o = formatter.normalizeCommand('run local "uname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });
});
