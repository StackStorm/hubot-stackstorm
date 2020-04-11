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

/*jshint quotmark:false*/
/*global describe, it*/
"use strict";

var chai = require('chai'),
  expect = chai.expect,
  env = process.env,
  adapters = require('../src/lib/adapters'),
  dummyAdapters = require('./dummy-adapters.js'),
  Log = require('log'),
  DummyRobot = require('./dummy-robot.js');

env.ST2_MAX_MESSAGE_LENGTH = 500;

var MockSlackAdapter = dummyAdapters.MockSlackAdapter;
var MockBotFrameworkAdapter = dummyAdapters.MockBotFrameworkAdapter;

describe('SlackFormatter', function() {
  var adapterName = 'slack';
  var logger = new Log('info');
  var robot = new DummyRobot(false, new MockSlackAdapter(logger));

  it('should create a snippet for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('DATA');
    expect(o).to.be.an('string');
    expect(o).to.equal('DATA');
  });

  it('should truncate text more than a certain length', function() {
    var org_max_length = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 10;
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('abcd efgh ijklm');
    env.ST2_MAX_MESSAGE_LENGTH = org_max_length;

    expect(o).to.be.an('string');
    expect(o).to.equal('abcd efgh ijklm');

  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should echo back recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run local \u201cuname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });

  it('should normalize command with special double quotes', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run remote \u201cuname -a" \u201dlocalhost, 127.0.0.1"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote "uname -a" "localhost, 127.0.0.1"');
  });

  it('should normalize command with special single quotes', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run remote \u2018uname -a\' \u2019localhost, 127.0.0.1\'');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote \'uname -a\' \'localhost, 127.0.0.1\'');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var msg = {
      message: {
        room: "SlackRoomName",
        user: {
          name: "SlackUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('SlackUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('SlackRoomName');
  });
});

describe('MattermostFormatter', function() {
  var adapterName = 'mattermost';
  var robot = new DummyRobot('dummy', null, false);

  it('should echo back for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('DATA');
    expect(o).to.be.an('string');
    expect(o).to.equal('DATA');
  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should correctly format recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command with special double quotes', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run remote \u201cuname -a" \u201dlocalhost, 127.0.0.1"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote "uname -a" "localhost, 127.0.0.1"');
  });

  it('should normalize command with special single quotes', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run remote \u2018uname -a\' \u2019localhost, 127.0.0.1\'');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote \'uname -a\' \'localhost, 127.0.0.1\'');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var msg = {
      message: {
        room: "MattermostRoomName",
        user: {
          name: "MattermostUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('MattermostUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('MattermostRoomName');
  });
});

describe('MSTeamsFormatter', function() {
  var adapterName = 'botframework';
  var robot = new DummyRobot('dummy', null, false);

  it('should echo back for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);

    var str = '\nst2 list actions\n';
    var o = adapter.formatData(str);
    expect(o).to.be.an('string');
    expect(o).to.equal('st2 list actions\n');

    var str = 'st2 list actions\n\nrun remote \u201cuname -a" \u201dlocalhost, 127.0.0.1"\n';
    var o = adapter.formatData(str);
    expect(o).to.be.an('string');
    expect(o).to.equal('st2 list actions\n\nrun remote \u201cuname -a" \u201dlocalhost, 127.0.0.1"\n');
  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should correctly format recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command by returning it', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run remote \u201cuname -a" \u201dlocalhost, 127.0.0.1"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote \u201cuname -a" \u201dlocalhost, 127.0.0.1"');
  });

  it('should normalize command by returning it', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run remote \u2018uname -a\' \u2019localhost, 127.0.0.1\'');
    expect(o).to.be.an('string');
    expect(o).to.equal('run remote \u2018uname -a\' \u2019localhost, 127.0.0.1\'');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var msg = {
      message: {
        room: "MSTeamsRoomName",
        user: {
          name: "MSTeamsUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('MSTeamsUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('MSTeamsRoomName');
  });
});

describe('HipChatFormatter', function() {
  var adapterName = 'hipchat';
  var robot = new DummyRobot('dummy', null, false);

  it('should echo back for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('DATA');
    expect(o).to.be.an('string');
    expect(o).to.equal('/code DATA');
  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should correctly format recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    env.HUBOT_HIPCHAT_JID = '234x_y234@conf.hipchat.com';
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('234x_Estee@conf.hipchat.com');
  });

  it('should correctly format recipient with conf.btf.hipchat.com', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    env.HUBOT_HIPCHAT_JID = '234x_y234@conf.hipchat.com';
    env.HUBOT_HIPCHAT_XMPP_DOMAIN = "btf.hipchat.com";
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('234x_Estee@conf.btf.hipchat.com');
  });

  it('should normalize command', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run local "uname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    // HipChat packages the room and user name differently
    var msg = {
      message: {
        user: {
          jid: "HipChatRoomName",
          mention_name: "HipChatUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('HipChatUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('HipChatRoomName');
  });
});

describe('RocketChatFormatter', function() {
  var adapterName = 'rocketchat';
  var robot = new DummyRobot('dummy', null, false);

  it('should echo back for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('DATA');
    expect(o).to.be.an('string');
    expect(o).to.equal('DATA');
  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should correctly format recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run local "uname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var msg = {
      message: {
        room: "RocketChatRoomName",
        user: {
          name: "RocketChatUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('RocketChatUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('RocketChatRoomName');
  });
});

describe('SparkFormatter', function() {
  var adapterName = 'spark';
  var robot = new DummyRobot('dummy', null, false);

  it('should echo back for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('DATA');
    expect(o).to.be.an('string');
    expect(o).to.equal('DATA');
  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should truncate text more than a certain length', function() {
    var old_ST2_MAX_MESSAGE_LENGTH = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 4;
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('asdfqwerty');
    expect(o).to.be.an('string');
    expect(o).to.equal('asdf...');
    env.ST2_MAX_MESSAGE_LENGTH = old_ST2_MAX_MESSAGE_LENGTH;
  });

  it('should not truncate text more than a certain length', function() {
    var old_ST2_MAX_MESSAGE_LENGTH = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 0;
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('asdfqwerty');
    expect(o).to.be.an('string');
    expect(o).to.equal('asdfqwerty');
    env.ST2_MAX_MESSAGE_LENGTH = old_ST2_MAX_MESSAGE_LENGTH;
  });

  it('should correctly format recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run local "uname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var msg = {
      message: {
        user: {
          roomId: "SparkRoomId",
          name: "SparkUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('SparkUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('SparkRoomId');
  });
});

describe('DefaultFormatter', function() {
  var adapterName = 'unknown';
  var robot = new DummyRobot('dummy', null, false);

  it('should create a snippet for non-empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('DATA');
    expect(o).to.be.an('string');
    expect(o).to.equal('DATA');
  });

  it('should truncate text more than a certain length', function() {
    var org_max_length = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 10;
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('abcd efgh ijklm');
    env.ST2_MAX_MESSAGE_LENGTH = org_max_length;

    expect(o).to.be.an('string');
    expect(o).to.equal('abcd efgh ...');
  });

  it('should truncate text more than a certain length', function() {
    var org_max_length = env.ST2_MAX_MESSAGE_LENGTH;
    env.ST2_MAX_MESSAGE_LENGTH = 0;
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('abcd efgh ijklm');
    env.ST2_MAX_MESSAGE_LENGTH = org_max_length;

    expect(o).to.be.an('string');
    expect(o).to.equal('abcd efgh ijklm');
  });

  it('should be an empty string for empty', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatData('');
    expect(o).to.be.an('string');
    expect(o).to.equal('');
  });

  it('should echo back recipient', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.formatRecipient('Estee');
    expect(o).to.be.an('string');
    expect(o).to.equal('Estee');
  });

  it('should normalize command', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var o = adapter.normalizeCommand('run local "uname -a"');
    expect(o).to.be.an('string');
    expect(o).to.equal('run local "uname -a"');
  });

  it('should normalize the addressee', function() {
    var adapter = adapters.getAdapter(adapterName, robot);
    var msg = {
      message: {
        room: "DefaultRoomName",
        user: {
          name: "DefaultUserName"
        }
      }
    };
    var o = adapter.normalizeAddressee(msg);
    expect(o.name).to.be.an('string');
    expect(o.name).to.equal('DefaultUserName');
    expect(o.room).to.be.an('string');
    expect(o.room).to.equal('DefaultRoomName');
  });
});
