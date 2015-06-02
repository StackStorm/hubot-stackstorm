/*jslint node: true */
"use strict";

var _ = require('lodash'),
    util = require('util'),
    Table = require('cli-table');

module.exports = function(data, formatType, logger) {
  var tableFormatData = function(data, logger) {
    if (!data) {
      return "";
    }

    data = JSON.parse(data);
    var table = new Table({
      style: {
        head: [],
        border: [],
        compact: false
      },
      head: ['Property', 'Value']
    });
    _.forEach(data, function(v, k) {
      table.push([k, v]);
    });
    return util.format('```\n%s```', table.toString());
  };

  var jsonFormatData = function(data, logger) {
    if (!data) {
      return "";
    }
    data = JSON.parse(data);
    return util.format('```\n%s\n```', JSON.stringify(data, null, 4));
  };

  var basicFormatData = function(data, logger) {
    if (!data) {
      return "";
    }
    return util.format('```\n%s\n```', data);
  };

  var dataformatters = {
    'table': tableFormatData,
    'json': jsonFormatData,
    'basic': basicFormatData
  };

  if (!formatType) {
    formatType = 'basic';
  }

  if (!(formatType in dataformatters)) {
    throw new Error(util.format('Formatter %s not supported.', formatType));
  }

  return dataformatters[formatType](data, logger);
};
