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

var uuidModule = require('uuid');
var sha256 = require('js-sha256').sha256;

function generateSalt(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
};

function saltAndHashSecret(salt, secret) {
  var hash = sha256.create();
  hash.update(salt);
  hash.update(secret);
  return hash.hex();
};

// Store out-of-band authentication session data
//
// :param: userId: :: user identifier, must be unique and immutable
// :param: userSecret: :: user's chosen secret authentication word
//
// return OutOfBandAuthenticationSession object
function OutOfBandAuthenticationSession(userId, userSecret, data) {
  var self = this;

  var salt = generateSalt(32);
  var now = Date.now();

  self.sessionId = uuidModule.v4();;
  self.userId = userId;
  self.created = now;
  self.modified = now;
  // TODO: Use setTimeout to call a function to automatically delete the session
  //       object from memory when it expires
  self.ttlInMilliseconds = (15 * 60 * 1000);
  self.sealed = true;
  self.salt = salt;
  self.hashedAndSaltedUserSecret = saltAndHashSecret(salt, userSecret);
  self.data = data;  // Arbitrary data

  return self;
};

OutOfBandAuthenticationSession.prototype.isExpired = function () {
  var self = this;
  return Date.now() > (self.modified + self.ttlInMilliseconds);
};

OutOfBandAuthenticationSession.prototype.unseal = function () {
  var self = this;
  if (self.isExpired()) {
    // TODO: Make this its own exception class
    throw Error("Session has already expired");
  }

  if (!self.sealed) {
    // TODO: Make this its own exception class
    throw Error("Session has already been consumed");
  }

  self.sealed = false;
};

OutOfBandAuthenticationSession.prototype.isSealed = function () {
  var self = this;
  if (self.isExpired()) {
    // TODO: Make this its own exception class
    throw Error("Session has already expired");
  }

  return self.sealed;
};

OutOfBandAuthenticationSession.prototype.id = function () {
  return this.sessionId;
};

OutOfBandAuthenticationSession.prototype.matchSecret = function (userSecret) {
  var self = this;
  if (self.isExpired()) {
    // TODO: Make this its own exception class
    throw Error("Session has already expired");
  }

  return self.hashedAndSaltedUserSecret === saltAndHashSecret(self.salt, userSecret);
};

module.exports = OutOfBandAuthenticationSession;
