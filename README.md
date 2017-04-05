[![StackStorm](https://github.com/stackstorm/st2/raw/master/stackstorm_logo.png)](http://www.stackstorm.com)

[![Build Status](https://api.travis-ci.org/StackStorm/hubot-stackstorm.svg?branch=master)](https://travis-ci.org/StackStorm/hubot-stackstorm) [![IRC](https://img.shields.io/irc/%23stackstorm.png)](http://webchat.freenode.net/?channels=stackstorm)

# StackStorm Hubot Plugin

Hubot plugin for integrating with StackStorm event-driven infrastructure
automation platform.

## Installing and configuring the plugin

To install and configure the plugin, first install hubot by following the
installation instructions at https://hubot.github.com/docs/.

After you have installed hubot and generated your bot, go to your bot directory
and install the plugin npm package:

```bash
npm install hubot-stackstorm
```

After that, edit the `external-scripts.json` file in your bot directory and
make sure it contains ``hubot-stackstorm`` entry.

```json
[
  ...
  "hubot-stackstorm"
]
```

Final file should look something like that:

```json

[
  "hubot-diagnostics",
  "hubot-help",
  "hubot-heroku-keepalive",
  "hubot-google-images",
  "hubot-google-translate",
  "hubot-pugme",
  "hubot-maps",
  "hubot-redis-brain",
  "hubot-rules",
  "hubot-shipit",
  "hubot-youtube",
  "hubot-stackstorm"
]
```

If you want to use this plugin with a Slack adapter, you also need to install
`hubot-slack` npm package.

```bash
npm install hubot-slack
```

After that's done, you are ready to start your bot.

## Plugin environment variable options

To configure the plugin behavior, the following environment variable can be
specified when running hubot:

* `ST2_API` - URL to the StackStorm API endpoint.
* `ST2_WEBUI_URL` - Base URL to the WebUI. If provided, link to the execution
  history will be provided in the chat after every execution (optional).
* `ST2_AUTH_USERNAME` - API credentials - username (optional).
* `ST2_AUTH_PASSWORD` - API credentials - password (optional).
* `ST2_AUTH_URL` - URL to the StackStorm Auth API (optional).
* `ST2_COMMANDS_RELOAD_INTERVAL` - How often the list of available commands
  should be reloaded. Defaults to every 120 seconds (optional).
* `ST2_MAX_MESSAGE_LENGTH` - Message truncation to preserve chat context. Default is 500 characters of length. 0 means no limit (optional).
* `ST2_SLACK_SUCCESS_COLOR` - Slack attachement color for success, can either be one of good, warning, danger, or any hex color code (optional).
* `ST2_SLACK_FAIL_COLOR` - Slack attachement color for failures either be one of good, warning, danger, or any hex color code (optional).
* `ST2_ROCKETCHAT_SUCCESS_COLOR` - RocketChat attachement color for success, can either be one of good, warning, danger, or any hex color code (optional).
* `ST2_ROCKETCHAT_FAIL_COLOR` - RocketChat attachement color for failures either be one of good, warning, danger, or any hex color code (optional).

Note: ``ST2_ROUTE`` environment variable mentioned below should only be
specified if you modified the rule which comes with a ``hubot`` pack to use a
non default value of ``hubot`` for the ``trigger.route`` criteria.

* `ST2_ROUTE` - StackStorm notification channel where all the notification messages
  should be sent to. This is the reference to the channel construct internal
  to StackStorm's notification system. Make sure this value is set to whatever
  is assigned the rule that defines a StackStrom channel. e.g. `hubot` is a value
  that works well with the `hubot` pack found at
  https://github.com/StackStorm/st2contrib/tree/master/packs/hubot.

## Running the bot

To run the bot, go to your bot directory and run the following command:

```bash
ST2_AUTH_USERNAME=testu ST2_AUTH_PASSWORD=testp HUBOT_SLACK_TOKEN=token ST2_ROUTE=mychannel PORT=8181 bin/hubot --name "st2-bot" -a slack --alias !
```


Keep in mind that you need to replace values of the environment variables so they
reflect configuration of your environment.

## Known issues / limitations

Please see https://github.com/StackStorm/hubot-stackstorm/issues

## Testing

### Lint

```bash
gulp lint
```

### Tests

```bash
gulp test
```

## Publishing

Reminder to ourselves, instead of bumping the version manually, use `mversion`.

```
npm install -g mversion
mversion patch
```

This will bump the version in `package.json`, commit and create a tag with format described in `.mversionrc`.

## Copyright, License, and Contributors Agreement

Copyright 2015 StackStorm, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this work except
in compliance with the License. You may obtain a copy of the License in the [LICENSE](LICENSE)
file, or at: [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

By contributing you agree that these contributions are your own (or approved by your employer) and
you grant a full, complete, irrevocable copyright license to all users and developers of the
project, present and future, pursuant to the license of the project.
