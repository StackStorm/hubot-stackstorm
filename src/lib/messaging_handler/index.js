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

var messagingHandlers = {};

filenames.forEach(function(filename) {
  if (filename === 'index.js') {
    return;
  }

  var message_handler = filename.replace(/\.[^\.]+$/, "");
  messagingHandlers[message_handler] = require(path.join(__dirname, filename));
});

module.exports.getMessagingHandler = function(adapterName, robot) {
  if (!(adapterName in messagingHandlers)) {
    robot.logger.warning(
      util.format('No post handler found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  robot.logger.debug(
    util.format('Using %s post data handler', adapterName));
  return new messagingHandlers[adapterName](robot);
};
