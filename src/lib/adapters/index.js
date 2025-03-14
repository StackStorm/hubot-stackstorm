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

"use strict";

var env = process.env;
var util = require('util');
var fs = require('fs');
var path = require('path');

var filenames = fs.readdirSync(__dirname);

var adapters = {};

filenames.forEach(function(filename) {
  if (filename === 'index.js') {
    return;
  }

  var adapterName = filename.replace(/\.[^\.]+$/, "");
  adapters[adapterName] = require(path.join(__dirname, filename));
});

module.exports.getAdapter = function(adapterName, robot) {
  if (adapterName === "@hubot-friends/hubot-slack") {
    adapterName = "slack";
  }
  if (!(adapterName in adapters)) {
    robot.logger.error(
      util.format('No adapter found for %s. Using DefaultAdapter.', adapterName));
    adapterName = 'default';
  }
  robot.logger.debug(
    util.format('Using %s adapter', adapterName));
  return new adapters[adapterName](robot);
};
