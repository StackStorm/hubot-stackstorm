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
//
// Description:
//   StackStorm hubot integration
//
// Dependencies:
//
//
// Configuration:
//   ST2_API_URL - FQDN + port to StackStorm endpoint
//   ST2_ROUTE - StackStorm notification route name
//   ST2_COMMANDS_RELOAD_INTERVAL - Reload interval for commands
//
// Notes:
//   Command list is automatically generated from StackStorm ChatOps metadata
//

"use strict";

var env = process.env;
var StackStormApi = require('./lib/stackstorm_api');

module.exports = function (robot) {
  var stackstormApi = new StackStormApi(robot);

  return stackstormApi.authenticate().then(function () {
    stackstormApi.start();
    return stackstormApi.stop.bind(stackstormApi);
  })
  // .catch(function(err) {
  //   console.log("got an error in stackstorm.js", err)
  //   throw err;
  // });
};
