/*jslint node: true */
"use strict";

var _ = require('lodash');

module.exports = function(logger, name, format, description) {
  var context, template_str, compiled_template, command;

  if (!format) {
    throw (Error('format should be non-empty.'));
  }

  context = {
    'format': format,
    'description': description
  };

  template_str = '${format} - ${description}';
  compiled_template = _.template(template_str);
  command = compiled_template(context);

  return command;
};
