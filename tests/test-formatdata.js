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
  formatdata = require('../lib/format_data.js');

describe('unknownFormatData', function() {
  it('should throw an exception', function() {
    assert.throws(function() {
      formatdata('', 'X', null);
    }, Error, 'Formatter X not supported.');
  });

  it('should pick basicFormatdata on null', function() {
    var o = formatdata('DATA', null, null);
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });

  it('should pick basicFormatdata on empty', function() {
    var o = formatdata('DATA', '', null);
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });
});


describe('tableFormatdata', function() {
  var format = 'table';

  it('should do nothing for empty data', function() {
    var o = formatdata('', format, null);
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should create the right table format', function() {
    var o = formatdata("{\"a\": 1}", format, null);
    expect(o).to.be.an('string');
    expect(o).to.equal('```\n┌──────────┬───────┐\n│ Property │ Value │\n├──────────┼───────┤\n│ a        │ 1     │\n└──────────┴───────┘```');
  });
});

describe('jsonFormatdata', function() {
  var format = 'json';

  it('should do nothing for empty data', function() {
    var o = formatdata('', format, null);
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should create the right json format', function() {
    var o = formatdata("{\"a\": 1}", format, null);
    expect(o).to.be.an('string');
    // Not a big fan of this test
    expect(o).to.equal('```\n{\n    \"a\": 1\n}\n```');
  });
});

describe('basicFormatdata', function() {
  var format = 'basic';

  it('should do nothing for empty data', function() {
    var o = formatdata('', format, null);
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should create the right basic format', function() {
    var o = formatdata('DATA', format, null);
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });
});
