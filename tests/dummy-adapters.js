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

function MockSlackClient(logger) {
    this.logger = logger;
}

MockSlackClient.prototype.send = function(envelope, message) {
    this.logger.info('Sending ' + JSON.stringify(message) + ' to ' + JSON.stringify(envelope));
};

function MockSlackAdapter(logger) {
    this.logger = logger;
    this.client = new MockSlackClient(logger);
}

function MockBotFrameworkAdapter(logger) {
    this.logger = logger;
}

MockBotFrameworkAdapter.prototype.send = function(envelope, message) {
    this.logger.info('Sending ' + JSON.stringify(message) + ' to ' + JSON.stringify(envelope));
};

module.exports.MockSlackAdapter =  MockSlackAdapter;
module.exports.MockBotFrameworkAdapter =  MockBotFrameworkAdapter;
