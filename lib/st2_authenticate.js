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

"use strict";

var _ = require('lodash'),
  env = process.env,
  Promise = require('rsvp').Promise,
  st2client = require('st2client'),
  util = require('util'),
  utils = require('../lib/utils.js');

// Controls around how many retries and interval between retry etc.
env.ST2_AUTH_RETRY_COUNT = parseInt(env.ST2_AUTH_RETRY || 10);
env.ST2_AUTH_RETRY_INTERVAL = parseInt(env.ST2_AUTH_RETRY_INTERVAL || 5);

var authenticate = function(st2AuthUrl, st2ApiUrl, username, password, logger) {
  return new Promise(function (resolve, reject) {
    var result = {};
    if (utils.isNull(username) && utils.isNull(password)) {
      // No username & no password therefore assume no auth.
      result['token'] = null;
      resolve(result);
    }
    if (utils.isNull(username) || utils.isNull(password)) {
      reject({
        name: 'St2AuthenticationError',
        message: 'Both username and password must be provided to authenticate.'
      });
    }

    // Now really try to authenticate.
    var credentials, config, st2_client, parsed;
    var self = this;

    credentials = {
      'user': username,
      'password': password
    };
    config = {
      'rejectUnauthorized': false,
      'credentials': credentials
    };

    if (!utils.isNull(st2AuthUrl)) {
      parsed = utils.parseUrl(st2AuthUrl);

      config['auth'] = {};
      config['auth']['host'] = parsed['hostname'];
      config['auth']['protocol'] = parsed['protocol'];
      config['auth']['port'] = parsed['port'];
    }
    else {
      parsed = utils.parseUrl(st2ApiUrl);

      config['host'] = parsed['hostname'];
      config['protocol'] = parsed['protocol'];
      config['port'] = parsed['port'];
    }

    st2_client = st2client(config);
    logger.info('Performing authentication...');

    // Wrap up in a function to support retry of authentication
    var do_retry_auth = function(retry_count) {
      st2_client.authenticate(config.credentials.user, config.credentials.password)
      .then(function(result) {
        logger.debug('Successfully authenticated.');
        resolve(result);
      }).catch(function(err) {
        if (retry_count < env.ST2_AUTH_RETRY_COUNT) {
            logger.debug(util.format('Failed to authenticate. retry_count : %s.', retry_count+1));
            // schedule auth retry after a set amount of time.
            setTimeout(do_retry_auth(retry_count + 1).bind(self), env.ST2_AUTH_RETRY_INTERVAL * 1000);
        } else {
          reject({
            name: 'St2AuthenticationError',
            message: 'Authentication failed : [' + err.name + ': ' + err.message + ']'
          });
        }
      });
    };

    do_retry_auth(0);

  });
};

module.exports = authenticate;
