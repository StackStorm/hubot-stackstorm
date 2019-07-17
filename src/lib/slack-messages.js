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

var utils = require('./utils.js');

var buildMessagesWithChunkedFieldValue = function (msg) {
  var msgs;

  if (JSON.stringify(msg).length <= utils.SLACK_MAX_MESSAGE_SIZE) {
    msgs = [msg];
  } else {
    // Cry loudly
    var error_msg = utils.constructFromAttrs(msg, ['icon_emoji', 'username']);
    error_msg.text = "ERROR: Could not complete request because there was too much data to send";
    msgs = [error_msg];
  }

  return msgs;
};

var buildMessagesWithSingleFieldInAttachment = function (msg) {
  var msgs = [], msg_length = JSON.stringify(msg).length;
  if (msg_length <= utils.SLACK_MAX_MESSAGE_SIZE) {
    msgs = [msg];
  } else {
    // Chunk up the field value
    var msg_meta_length = msg_length - msg.attachments[0].fields[0].value.length;
    var field_chunk_size = utils.SLACK_MAX_MESSAGE_SIZE - msg_meta_length;
    // If the fields cause the meta length to be larger than
    // utils.SLACK_MAX_MESSAGE_SIZE, then text_chunk_size will be negative.
    // This simply means that we don't need to chunk up the attachment text,
    // so set text_chunk_size back to utils.SLACK_MAX_MESSAGE_SIZE.
    if (field_chunk_size < 0) { field_chunk_size = utils.SLACK_MAX_MESSAGE_SIZE; }
    var field_value_chunks = utils.getTextChunks(msg.attachments[0].fields[0].value, field_chunk_size);

    field_value_chunks.forEach(function (value_chunk) {
      var field = Object.assign({}, msg.attachments[0].fields[0]);
      var msg_attachment_field_value = Object.assign({}, msg, {attachments: [{fields: [field]}]});
      msg_attachment_field_value.attachments[0].fields[0].value = value_chunk;

      msgs = msgs.concat(buildMessagesWithChunkedFieldValue(msg_attachment_field_value));
    });
  }

  return msgs;
};

var buildMessagesWithChunkedAttachmentText = function (msg) {
  var msgs = [];

  if (JSON.stringify(msg).length <= utils.SLACK_MAX_MESSAGE_SIZE) {
    msgs = [msg];
  } else {
    // Send each field individually
    msg.attachments[0].fields.forEach(function (field) {
      var msg_attachment_single_field = Object.assign({}, msg, {attachments: [{fields: [field]}]});

      msgs = msgs.concat(buildMessagesWithSingleFieldInAttachment(msg_attachment_single_field));
    });
  }

  return msgs;
};

var buildMessagesWithSingleAttachment = function (msg) {
  var msgs = [], msg_length = JSON.stringify(msg).length;
  if (msg_length <= utils.SLACK_MAX_MESSAGE_SIZE) {
    msgs = [msg];
  } else {
    // Chunk up the attachment text
    // NOTE: In order to do this properly, we will need to break up text into
    //       <4K chunks and send them individually. However, once we have
    //       broken one attachment into many chunks, we should only send some
    //       attributes on the first chunk or the last chunk.
    //
    // send every message:
    // icon_emoji
    // username
    // color
    //
    // sent in the first message:
    // fallback
    // pretext
    // author_name
    // author_link
    // author_icon
    // title
    // title_link
    // image_url
    // thumb_url
    //
    // sent in the last message:
    // fields
    // footer
    // footer_icon
    // ts (timestamp)
    //
    // This should simulate a single attachment as best we can:
    //
    //                username APP 0:00 PM
    // [icon_emoji] |
    //              | [author_icon] author_name
    //              | title
    //              | text
    //              |
    //
    //                username APP 0:00 PM
    // [icon_emoji] |
    //              | text
    //
    //                username APP 0:00 PM
    // [icon_emoji] |
    //              | text
    //
    //                username APP 0:00 PM
    // [icon_emoji] |
    //              | fields.1.title
    //              | fields.1.value
    //              |
    //              | [footer_icon] footer  |  ts
    var msg_meta_length = msg_length - msg.attachments[0].text.length;
    var text_chunk_size = utils.SLACK_MAX_MESSAGE_SIZE - msg_meta_length;
    // If the fields cause the meta length to be larger than
    // utils.SLACK_MAX_MESSAGE_SIZE, then text_chunk_size will be negative.
    // This simply means that we don't need to chunk up the attachment text,
    // so set text_chunk_size back to utils.SLACK_MAX_MESSAGE_SIZE.
    if (text_chunk_size < 0) { text_chunk_size = utils.SLACK_MAX_MESSAGE_SIZE; }

    var text_chunks = utils.getTextChunks(msg.attachments[0].text, text_chunk_size);

    var first_data_to_send, last_data_to_send;

    first_data_to_send = Object.assign({}, msg);
    first_data_to_send.attachments = [
      utils.constructFromAttrs(msg.attachments[0], [
        'fallback', 'pretext', 'author_name', 'author_link', 'author_icon',
        'title', 'title_link', 'image_url', 'thumb_url'
      ])
    ];
    first_data_to_send.attachments[0].text = text_chunks[0];

    last_data_to_send = Object.assign({}, msg);
    last_data_to_send.attachments = [
      utils.constructFromAttrs(msg.attachments[0], [
        'fields', 'footer', 'footer_icon', 'ts'
      ])
    ];
    if (last_data_to_send.text) { delete last_data_to_send.text; }
    if (text_chunks.length > 1) {
      last_data_to_send.attachments[0].text = text_chunks[text_chunks.length-1];
    }

    msgs = msgs.concat(buildMessagesWithChunkedAttachmentText(first_data_to_send));
    text_chunks.forEach(function (text_chunk, i) {
      if (i === 0 || i === text_chunks.length-1) { return; }

      var data_to_send = Object.assign({}, msg, {attachments: [{text: text_chunk}]});
      if (data_to_send.text) { delete data_to_send.text; }

      msgs = msgs.concat(buildMessagesWithChunkedAttachmentText(data_to_send));
    });

    msgs = msgs.concat(buildMessagesWithChunkedAttachmentText(last_data_to_send));
  }

  return msgs;
};

var buildMessagesChunkedText = function (msg) {
  var msgs = [], msg_length = JSON.stringify(msg).length;
  if (msg_length <= utils.SLACK_MAX_MESSAGE_SIZE) {
    msgs = [msg];
  } else {
    // Don't try to chunk up each attachment yet, just send them all
    // individually
    msg.attachments.forEach(function (attachment, i) {
      var msg_with_single_attachment = Object.assign({}, msg, {attachments: [attachment]});
      msgs = msgs.concat(buildMessagesWithSingleAttachment(msg_with_single_attachment));
    });
  }

  return msgs;
};

var buildMessages = function (msg) {
  var msgs = [], msg_length = JSON.stringify(msg).length;
  if (msg_length <= utils.SLACK_MAX_MESSAGE_SIZE) {
    msgs = [msg];
  } else if (msg.text) {
    var msg_meta_length = msg_length - msg.text.length - JSON.stringify(msg.attachments).length;
    var text_chunk_size = utils.SLACK_MAX_MESSAGE_SIZE - msg_meta_length;

    var text_chunks = utils.getTextChunks(msg.text, text_chunk_size);
    text_chunks.forEach(function (text_chunk, i) {
      var msg_with_text_chunk = Object.assign({}, msg, {text: text_chunk});

      if (i !== text_chunks.length-1) { delete msg_with_text_chunk.attachments; }
      msgs = msgs.concat(buildMessagesChunkedText(msg_with_text_chunk));
    });
  } else {
    msgs = msgs.concat(buildMessagesChunkedText(msg));
  }

  return msgs;
};

exports.buildMessages = buildMessages;
