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
  formatcommand = require('../lib/format_command.js');

describe('format_command', function() {
  it('should create the right format with format and description',
    function() {
      var o = formatcommand(null, 'a', 'format', 'description');
      expect(o).to.be.an('string');
      expect(o).to.equal('format - description');
    });

  it('should create the right format with format',
    function() {
      var o = formatcommand(null, 'a', 'format', '');
      expect(o).to.be.an('string');
      expect(o).to.equal('format - ');
    });

  it('should throw an exception', function() {
    assert.throws(function() {
        formatcommand(null, 'a', '', 'description');
      },
      Error, 'format should be non-empty.');
  });
});
