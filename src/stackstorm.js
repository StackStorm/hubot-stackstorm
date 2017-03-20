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
var utils = require('./lib/utils');
var messaging_handler = require('./lib/messaging_handler');
var CommandFactory = require('./lib/command_factory');
var StackStormApi = require('./lib/stackstorm_api');
var uuid = require('node-uuid');

module.exports = function (robot) {
  var self = this;

  var stackstormApi = new StackStormApi(robot.logger);
  var commandFactory = new CommandFactory(robot);
  var messagingHandler = messaging_handler.getMessagingHandler(robot.adapterName, robot);


  robot.router.post('/hubot/st2', function (req, res) {
    var data;
    try {
      if (req.body.payload) {
        data = JSON.parse(req.body.payload);
      } else {
        data = req.body;
      }
      messagingHandler.postData(data);
      res.send('{"status": "completed", "msg": "Message posted successfully"}');
    } catch (e) {
      robot.logger.error("Unable to decode JSON: " + e);
      robot.logger.error(e.stack);
      res.send('{"status": "failed", "msg": "An error occurred trying to post the message: ' + e + '"}');
    }
  });

  stackstormApi.on('st2.chatops_announcement', function (data) {
    messagingHandler.postData(data);
  });

  stackstormApi.on('st2.execution_error', function (data) {
    messagingHandler.postData({
      whisper: false,
      user: data.addressee.name,
      channel: data.addressee.room,
      message: data.message,
      extra: {
        color: '#F35A00'
      }
    });
  });

  commandFactory.on('st2.command_match', function (data) {
    stackstormApi.executeCommand(data.msg, data.alias_name, data.command_format_string, data.command, data.addressee);
  });

  return stackstormApi.authenticate()
    .then(function () {
      return stackstormApi.getAliases();
    })
    .then(function (aliases) {
      _.each(aliases, function (alias) {
        commandFactory.addCommand(alias, messagingHandler);
      });
    })
    .then(function () {
      return stackstormApi.startListener();
    });
};
