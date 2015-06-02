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

var fs = require('fs');
var path = require('path');

var SCRIPTS_PATH = path.resolve(__dirname, 'scripts');


module.exports = function(robot, scripts) {
  var filenames;

  if (!fs.existsSync(SCRIPTS_PATH)) {
    return null;
  }

  filenames = fs.readdirSync(SCRIPTS_PATH);

  filenames.forEach(function(filename) {
    if (scripts && scripts.indexOf('*') === -1 && scripts.indexOf(filename) !== -1) {
      robot.loadFile(SCRIPTS_PATH, filename);
    }
    else {
      robot.loadFile(SCRIPTS_PATH, filename);
    }
  });
};
