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

function sendMessageRaw(message) {
  /*jshint validthis:true */
  message['channel'] = this.id;
  message['parse'] = 'none';
  this._client._send(message);
}

function patchSendMessage(robot) {
  // We monkey patch sendMessage function to send "parse" argument with the message so the text is not
  // formatted and parsed on the server side.
  // NOTE / TODO: We can get rid of this nasty patch once our node-slack-client and hubot-slack pull
  // requests are merged.
  // This code was refactored in https://github.com/StackStorm/hubot-stackstorm/pull/6
  // which was opened and merged by Kami on 2015-06-04.
  // As of 2019-05-22, these were the PRs I could find for the node-slack-client
  // hubot-slack repositories:
  // * https://github.com/slackapi/node-slack-sdk/pull/42
  //   - which was closed during a refactor and converted into an issue:
  //     https://github.com/slackapi/node-slack-sdk/issues/138
  // * https://github.com/slackapi/hubot-slack/pull/544
  //   - which was opened on 2018-11-14, which seems to be too late to actually
  //     apply to this code
  // So...I'm not entirely sure this monkey patch is still necessary.
  // End-to-end testing is required to figure out for sure.
  if (robot.adapter && robot.adapter.constructor && robot.adapter.constructor.name === 'SlackBot') {
    for (var channel in robot.adapter.client.channels) {
      robot.adapter.client.channels[channel].sendMessage = sendMessageRaw.bind(robot.adapter.client.channels[channel]);
    }
  }
}


exports.patchSendMessage = patchSendMessage;
