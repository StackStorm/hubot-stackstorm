0.2.0
-----
* Preserve user supplied casing for chat literals. (bug-fix)
* Refactor formatting code to handle various adapter better. Tested support for
  slack, hubot and xmpp.
* Message truncation over 500 characters to preserve chat context. HipChat does its
  own truncation so depending on that.
* Authentication with StackStorm is now skipped in case auth is disabled. (bug-fix)
* Best attempt to include execution details. (new feature)
* Rather than a single message response to an execution comprises of multiple small
  messages. This allows formatting & truncation to be handled separately. (new feature)

0.1.2
-----
* Support Hipchat channel type and message format (@Itxaka)
* hubot-stackstorm does not cause hubot to quit on authentication failure.
* Authentication code is resilient to unavailability or StackStorm service. Will retry a configurable number of times.

0.1.1
-----

* Add support for including a link to the execution details in the WebUI when an execution has
  been scheduled and when it has finished.
* Fix a bug with parsing of port from the API and AUTH URLs.

0.1.0
-----

* Initial release.
