0.3.0
-----
* Switched to st2client.js
* Chatops announcements (new feature)
* Custom formatting for results (new feature)
* Disabling ack and results for specific aliases (new feature)
* Connect using API keys when provided (new feature)
* Better parameters parsing (improvement)
* Multi-line and milti-word matching (improvement)
* Start renewing tokens based on expiry time (improvement)

0.2.6
-----
* Results are posted to slack as attachments with appropriate colors. (Feature - thomaspicquet)

0.2.5
-----
* Bring back support for spaces in commands (regression fix)
* Handle slack special quotes (bug fix)

0.2.4
-----

* include content-type in headers

0.2.3
-----

* fixes to command factory regex (amaline)
* rename notification channel to route.
* fix command normalization by using global string replace.

0.2.2
-----

* Log a better error message if we fail to load the commands because of the StackStorm API unavailability.

0.2.1
-----

* Switched to use StackStorm API v1 instead of exp.

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
* Authentication code is resilient to unavailability or StackStorm service. Will retry a
  configurable number of times.

0.1.1
-----

* Add support for including a link to the execution details in the WebUI when an execution has
  been scheduled and when it has finished.
* Fix a bug with parsing of port from the API and AUTH URLs.

0.1.0
-----

* Initial release.
