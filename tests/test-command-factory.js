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

var fs = require('fs'),
  chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  CommandFactory = require('../lib/command_factory.js'),
  Robot = require('./dummy-robot.js'),
  formatCommand = require('../lib/format_command.js');

var ALIAS_FIXTURES = fs.readFileSync('tests/fixtures/aliases.json');
ALIAS_FIXTURES = JSON.parse(ALIAS_FIXTURES);


function getCleanCommandFactory() {
  var robot = new Robot(false);
  return new CommandFactory(robot);
}

describe('command factory', function() {
  it('should add commands to robot', function() {
    var command_factory, alias;

    command_factory = getCleanCommandFactory();
    alias = ALIAS_FIXTURES[0];

    command_factory.addCommand(
      formatCommand(null, alias.name, alias.formats[0], alias.description),
      alias.name,
      alias.formats[0],
      alias);

    expect(command_factory.robot.commands).to.have.length(1);
  });

  it('should add multiple commands to robot', function() {
    var command_factory, alias, alias_format, idx_a, idx_f, alias_count;

    alias_count = 0;
    command_factory = getCleanCommandFactory();

    for (idx_a = 0; idx_a < ALIAS_FIXTURES.length; idx_a++) {
      alias = ALIAS_FIXTURES[idx_a];
      for (idx_f = 0; idx_f < alias.formats.length; idx_f++) {
        alias_format = alias.formats[idx_f];
        command_factory.addCommand(
          formatCommand(null, alias.name, alias_format, alias.description),
          alias.name,
          alias_format,
          alias);
        alias_count++;
      }
    }

    expect(command_factory.robot.commands).to.have.length(alias_count);
  });

  it('should match various command literals for same format with defaults', function() {
    var command_factory, alias, match;

    command_factory = getCleanCommandFactory();
    alias = ALIAS_FIXTURES[0];

    command_factory.addCommand(
      formatCommand(null, alias.name, alias.formats[0], alias.description),
      alias.name,
      alias.formats[0],
      alias);

    expect(command_factory.robot.commands).to.have.length(1);

    match = command_factory.getMatchingCommand('alias1 fmt1 value1 breaking words value2');
    expect(match[0]).to.equal('alias1');

    match = command_factory.getMatchingCommand('alias1 fmt1 value1 breaking words');
    expect(match[0]).to.equal('alias1');

  });

  it('should match command literals for various formats of an alias', function() {
    var command_factory, alias, alias_format, match, idx_f;

    command_factory = getCleanCommandFactory();
    alias = ALIAS_FIXTURES[1];

    for (idx_f = 0; idx_f < alias.formats.length; idx_f++) {
      alias_format = alias.formats[idx_f];
      command_factory.addCommand(
        formatCommand(null, alias.name, alias_format, alias.description),
        alias.name,
        alias_format,
        alias);
    }

    expect(command_factory.robot.commands).to.have.length(2);

    match = command_factory.getMatchingCommand('alias2 fmt1 value1 value2');
    expect(match[0]).to.equal('alias2');
    expect(match[1]).to.equal('alias2 fmt1 {{param1}} {{param2}}');

    match = command_factory.getMatchingCommand('alias2 fmt2 value1 some more words');
    expect(match[0]).to.equal('alias2');
    expect(match[1]).to.equal('alias2 fmt2 {{param1}} some more words');
  });

});
