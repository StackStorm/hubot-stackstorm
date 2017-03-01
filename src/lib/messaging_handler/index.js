"use strict";

var _ = require('lodash');
var env = process.env;
var util = require('util');
var fs = require('fs');
var path = require('path');

var filenames = fs.readdirSync(__dirname);

var messagingHandlers = {};

filenames.forEach(function(filename) {
  if (filename === 'index.js') {
    return;
  }

  var message_handler = filename.replace(/\.[^/.]+$/, "");
  messagingHandlers[message_handler] = require(path.join(__dirname, filename));
});

module.exports.getMessagingHandler = function(adapterName, robot) {
  if (!(adapterName in messagingHandlers)) {
    robot.logger.warning(
      util.format('No post handler found for %s. Using DefaultFormatter.', adapterName));
    adapterName = 'default';
  }
  robot.logger.debug(
    util.format('Using %s post data handler.', adapterName));
  return new messagingHandlers[adapterName](robot);
};