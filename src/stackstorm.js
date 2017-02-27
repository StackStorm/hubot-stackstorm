// Licensed to the StackStorm, Inc ('StackStorm') under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Description:
//   StackStorm hubot integration
//
// Dependencies:
//
//
// Configuration:
//   ST2_API - FQDN + port to StackStorm endpoint
//   ST2_ROUTE - StackStorm notification route name
//   ST2_COMMANDS_RELOAD_INTERVAL - Reload interval for commands
//
// Notes:
//   Command list is automatically generated from StackStorm ChatOps metadata
//

"use strict";

var _ = require('lodash');
var util = require('util');
var env = _.clone(process.env);
var Promise = require('rsvp').Promise;
var utils = require('../lib/utils');
var formatCommand = require('./lib/format_command');
var formatData = require('./lib/format_data');
var messaging_handler = require('./lib/messaging_handler');
var CommandFactory = require('./lib/command_factory');
var StackStormApi = require('./lib/stackstorm_api');
var st2client = require('st2client');
var uuid = require('node-uuid');

module.exports = function(robot) {
  var self = this;

  var promise = Promise.resolve();

  // factory to manage commands
  var command_factory = new CommandFactory(robot);

  // formatter to manage per adapter message formatting.
  var formatter = formatData.getFormatter(robot.adapterName, robot);

  // handler to manage per adapter message post-ing.
  var messagingHandler = messaging_handler.getMessagingHandler(robot.adapterName, robot, formatter);

  var stackstorm_api = new StackStormApi(robot.logger);



  // Authenticate with StackStorm backend and then call start.
  // On a failure to authenticate log the error but do not quit.
  return promise.then(function () {
    start();
    return stop;
  });
};
