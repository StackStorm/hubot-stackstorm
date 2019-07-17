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

var Logger = require('./dummy-logger.js');

function Robot(name, adapter, enable_logging, robot_name) {
  this.logger = new Logger(enable_logging);
  this.name = name;
  this.commands = [];
  this.adapter = adapter;
  this.robot_name = robot_name;

  this.messageRoom = function(recipient, data) {
    return;
  }

  this.emit = function(event, data) {
    return;
  }
}

module.exports = Robot;
