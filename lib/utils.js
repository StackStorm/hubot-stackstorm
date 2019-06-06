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

var url = require('url'),
  util = require('util'),
  env = process.env;

var _ = require('lodash');

var WEBUI_EXECUTION_HISTORY_URL = '%s/#/history/%s/general';
var MESSAGE_EXECUTION_ID_REGEX = new RegExp('.*execution: (.+).*');
var CLI_EXECUTION_GET_CMD = 'st2 execution get %s';
var PRETEXT_DELIMITER = '{~}';
var SLACK_MAX_MESSAGE_SIZE = 4000;  // Max attachment size, in characters
var DISPLAY = 1;
var REPRESENTATION = 2;


function isNull(value) {
  return (!value) || value === 'null';
}

function getExecutionHistoryUrl(execution_model) {
  var url = execution_model.web_url;
  var execution_id = execution_model.id;

  if (url) {
    return url;
  }

  if (isNull(env.ST2_WEBUI_URL)) {
    return null;
  }

  if (!execution_id) {
    return null;
  }

  url = util.format(WEBUI_EXECUTION_HISTORY_URL, env.ST2_WEBUI_URL, execution_id);
  return url;
}

function parseUrl(url_string) {
  var parsed, result;

  parsed = url.parse(url_string);

  result = {};
  result['hostname'] = parsed['hostname'];
  result['protocol'] = parsed['protocol'].substring(0, (parsed['protocol'].length - 1));

  if (parsed['port'] !== null) {
    result['port'] = parseInt(parsed['port'], 10);
  }
  else {
    if (result['protocol'] === 'http') {
      result['port'] = 80;
    }
    else {
      result['port'] = 443;
    }
  }

  result['path'] = parsed['path'];

  return result;
}

function getTextChunks(text, length) {
  return text.match(new RegExp("[\\s\\S]{1," + length + "}", 'g')) || [];
}

function splitMessage(message) {
  var splitted = message.split(PRETEXT_DELIMITER);
  return {
    'pretext': splitted.length > 1 ? splitted[0] : "",
    'text': splitted.length > 1 ? splitted[1] : splitted[0]
  };
}

function constructFromAttrs(from_obj, attrs) {
  var rtn_obj = {};

  attrs.forEach(function (attr) {
    if (from_obj[attr] !== undefined) {
      rtn_obj[attr] = from_obj[attr];
    }
  });

  return rtn_obj;
}

function enable2FA(action_alias) {
  return env.HUBOT_2FA &&
         action_alias.extra && action_alias.extra.security &&
         action_alias.extra.security.twofactor !== undefined;
}

exports.isNull = isNull;
exports.getExecutionHistoryUrl = getExecutionHistoryUrl;
exports.parseUrl = parseUrl;
exports.getTextChunks = getTextChunks;
exports.splitMessage = splitMessage;
exports.constructFromAttrs = constructFromAttrs;
exports.enable2FA = enable2FA;
exports.SLACK_MAX_MESSAGE_SIZE = SLACK_MAX_MESSAGE_SIZE;
exports.DISPLAY = DISPLAY;
exports.REPRESENTATION = REPRESENTATION;
