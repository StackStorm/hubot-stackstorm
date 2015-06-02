/*jshint quotmark:false*/
/*global describe, it*/
"use strict";

var chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  formatdata = require('../lib/format_data.js')

describe('unknownFormatData', function() {
  it('should throw an exception', function() {
    assert.throws(function() {
      formatdata('', 'X', null)
    }, Error, 'Formatter X not supported.')
  });

  it('should pick basicFormatdata on null', function() {
    var o = formatdata('DATA', null, null)
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });

  it('should pick basicFormatdata on empty', function() {
    var o = formatdata('DATA', '', null)
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });

});


describe('tableFormatdata', function() {
  var format = 'table'

  it('should do nothing for empty data', function() {
    var o = formatdata('', format, null)
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should create the right table format', function() {
    var o = formatdata("{\"a\": 1}", format, null)
    expect(o).to.be.an('string');
    expect(o).to.equal('```\n┌──────────┬───────┐\n│ Property │ Value │\n├──────────┼───────┤\n│ a        │ 1     │\n└──────────┴───────┘```');
  });
});

describe('jsonFormatdata', function() {
  var format = 'json'

  it('should do nothing for empty data', function() {
    var o = formatdata('', format, null)
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should create the right json format', function() {
    var o = formatdata("{\"a\": 1}", format, null)
    expect(o).to.be.an('string');
    // Not a big fan of this test
    expect(o).to.equal('```\n{\n    \"a\": 1\n}\n```');
  });
});

describe('basicFormatdata', function() {
  var format = 'basic'

  it('should do nothing for empty data', function() {
    var o = formatdata('', format, null)
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should create the right basic format', function() {
    var o = formatdata('DATA', format, null)
    expect(o).to.be.an('string');
    expect(o).to.equal('```\nDATA\n```');
  });
});
