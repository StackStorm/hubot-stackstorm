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

var util = require('util');
var utils = require('./../utils');
var DefaultAdapter = require('./default');


// NOTE: Be careful about making changes to this adapter, because the adapters
//       for Mattermost, Cisco Spark, and Rocketchat all inherit from this one
function SlackLikeAdapter(robot) {
  var self = this;
  DefaultAdapter.call(self, robot);
}

util.inherits(SlackLikeAdapter, DefaultAdapter);

SlackLikeAdapter.prototype.postData = function(data) {
  throw Error("Children of SlackLikeAdapter must override postData");
};

SlackLikeAdapter.prototype.formatData = function(data) {
  if (utils.isNull(data)) {
    return "";
  }
  // For slack we do not truncate or format the result. This is because
  // data is posted to slack as a message attachment.
  return data;
};

SlackLikeAdapter.prototype.formatRecipient = function(recipient) {
  return recipient;
};

SlackLikeAdapter.prototype.normalizeCommand = function(command) {
  var self = this;
  command = DefaultAdapter.prototype.normalizeCommand.call(self, command);
  // replace left double quote with regular quote
  command = command.replace(/\u201c/g, '\u0022');
  // replace right double quote with regular quote
  command = command.replace(/\u201d/g, '\u0022');
  // replace left single quote with regular apostrophe
  command = command.replace(/\u2018/g, '\u0027');
  // replace right single quote with regular apostrophe
  command = command.replace(/\u2019/g, '\u0027');
  return command;
};

module.exports = SlackLikeAdapter;
