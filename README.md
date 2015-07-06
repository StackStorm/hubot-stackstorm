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
````

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

Note: ``ST2_CHANNEL`` environment variable mentioned below should only be
specified if you modified the rule which comes with a ``hubot`` pack to use a
non default value of ``hubot`` for the ``trigger.channel`` criteria.

* `ST2_CHANNEL` - Notification channel where all the notification messages
  should be sent to. This is the reference to the channel construct internal
  to StackStorm's notification system. Make sure this value is set to whatever
  is assigned the rule that defines a StackStrom channel. e.g. `hubot` is a value
  that works well with the `hubot` pack found https://github.com/StackStorm/st2contrib/tree/master/packs/hubot.

## Running the bot

To run the bot, go to your bot directory and run the following command:

```bash
ST2_AUTH_USERNAME=testu ST2_AUTH_PASSWORD=testp HUBOT_SLACK_TOKEN=token ST2_CHANNEL=mychannel PORT=8181 bin/hubot --name "st2-bot" -a slack --alias !
```


Keep in mind that you need to replace values of the environment variables so they
reflect configuration of your environment.

## Testing

### Lint

```bash
gulp lint
```

### Tests

```bash
gulp test
```

## License

StackStorm plugin is distributed under the [Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0.html).
