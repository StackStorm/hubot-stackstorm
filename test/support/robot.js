// Copyright 2026 The StackStorm Authors.
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

var path = require('path');

// A running hubot Robot on an in-memory adapter. hubot is an ES module, so this is async: call it
// from a before() hook. The adapter is named after hubot-stackstorm's DefaultAdapter (plain-text
// posts), and it emits 'send' and 'reply' with (envelope, strings) for the tests to watch.
async function createRobot(options) {
  var opts = Object.assign({ httpd: false, name: 'Hubot', alias: false }, options);
  var hubot = await import('hubot');

  class TestAdapter extends hubot.Adapter {
    constructor(robot) {
      super(robot);
      this.name = 'default';
    }
    async send(envelope, ...strings) {
      this.emit('send', envelope, strings);
    }
    async reply(envelope, ...strings) {
      this.emit('reply', envelope, strings);
    }
    async run() {
      this.emit('connected');
    }
    close() {}
  }

  if (opts.httpd) {
    // any free port, so test files don't collide
    process.env.EXPRESS_PORT = '0';
  }

  var robot = new hubot.Robot({ use: function (r) { return new TestAdapter(r); } }, opts.httpd, opts.name, opts.alias);
  await robot.loadAdapter();
  // run() creates robot.router, which hubot-stackstorm registers its endpoint on
  await robot.run();
  return robot;
}

// Say something to the robot as `user`.
async function say(robot, user, text) {
  var hubot = await import('hubot');
  return robot.adapter.receive(new hubot.TextMessage(user, text, String(Date.now())));
}

function loadHelp(robot) {
  return robot.loadFile(path.resolve(__dirname, '..', '..', 'node_modules', 'hubot-help', 'src'), 'help.js');
}

// Load ../src/stackstorm.js fresh: stackstorm_api.js copies process.env when it is first required.
function freshStackstorm() {
  delete require.cache[require.resolve('../../src/stackstorm.js')];
  delete require.cache[require.resolve('../../src/lib/stackstorm_api.js')];
  return require('../../src/stackstorm.js');
}

module.exports = {
  createRobot: createRobot,
  say: say,
  loadHelp: loadHelp,
  freshStackstorm: freshStackstorm
};
