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

"use strict";

function OutOfBandAuthenticationSessionStore(logger) {
  var self = this;

  self.logger = logger;
  self.memory = {};
  self.idToUserIdMap = {};
};

OutOfBandAuthenticationSessionStore.prototype.list = function () {
  var self = this;

  return self.memory.values();
};

OutOfBandAuthenticationSessionStore.prototype.getByUserId = function (userId) {
  var self = this;

  if (userId in self.memory) {
    return self.memory[userId];
  } else {
    return false;
  }
};

OutOfBandAuthenticationSessionStore.prototype.put = function (session) {
  var self = this;

  self.memory[session.userId] = session;
  self.idToUserIdMap[session.id()] = session.userId;

  return session;
};

OutOfBandAuthenticationSessionStore.prototype.delete = function (userId) {
  var self = this

  if (userId in self.memory) {
    var session = self.memory[userId];
    if (session.id() in self.idToUserIdMap) {
      delete self.idToUserIdMap[session.id()];
    }
    delete self.memory[userId];
  } else {
    self.logger.debug("Failed to delete userId " + userId + " session - not found.");
  }
};

OutOfBandAuthenticationSessionStore.prototype.putById = function (sessionId, session) {
  var self = this;
  if (session.userId in self.memory) {
    self.idToUserIdMap[sessionId] = session.userId;
  }
};

OutOfBandAuthenticationSessionStore.prototype.getByUuid = function (sessionId) {
  var self = this;

  if (sessionId in self.idToUserIdMap) {
    var userId = self.idToUserIdMap[sessionId];
    if (userId in self.memory) {
      return self.memory[userId];
    } else {
      self.logger.debug('Error: Session ID ' + ' points to a missing session.');
      return false;
    }
  } else {
    self.logger.debug('Error: Session ID ' + ' points to a missing session.');
    return false;
  }
};

module.exports = OutOfBandAuthenticationSessionStore;
