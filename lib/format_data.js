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
