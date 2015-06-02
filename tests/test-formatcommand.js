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
