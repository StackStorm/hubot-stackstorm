#!/bin/bash

docker="/usr/bin/sudo /usr/bin/docker"
st2="/usr/bin/st2"

echo
echo Starting Hubot self-check.
echo ==========================
echo

# Check if Hubot is installed and running
if [ "true" = "$($docker inspect --format='{{.State.Running}}' hubot)" ]; then
    echo Step 1: Hubot is running.
else
    echo Step 1 failed: Hubot container is not running on this machine.
    echo
    echo Your StackStorm installation could be outdated or incomplete.
    echo Try reinstalling or running the update script:
    echo
    echo sudo update-system
    echo
    exit 1
fi

# Check if Hubot-stackstorm is installed
npm=$($docker exec -it hubot npm list | grep hubot-stackstorm | sed -r "s/.*\s(hubot.*)\\r/\1/")
if [ "0" = "$(echo "$npm" | wc -c)" ]; then
    echo Step 2 failed: Hubot-stackstorm is not installed inside the container.
    echo
    echo It\'s possible the container is outdated or corrupted.
    echo Try removing it and restarting the init script:
    echo
    echo sudo service docker-hubot stop
    echo sudo docker rmi stackstorm/hubot
    echo sudo service docker-hubot start
    echo
    exit 1
else
    echo "Step 2: Hubot-stackstorm is installed ($npm)."
fi

# Check if there are any enabled StackStorm aliases
if [ "0" = "$($st2 action-alias list -a enabled | grep True | wc -l)" ]; then
    echo Step 3 failed: StackStorm doesn\'t seem to have registered and enabled aliases.
    echo
    echo Create one or install a sample pack with aliases.
    echo The "st2" pack would be a good example:
    echo
    echo st2 action execute packs.install packs=st2
    echo
    exit 1
else
    echo Step 3: StackStorm has aliases that are registered and enabled.
fi

# Check that chatops.notify rule is present
if [ "0" = "$($st2 rule list | grep chatops.notify | wc -l)" ]; then
    echo Step 4 failed: Chatops.notify rule is not present.
    echo
    echo ChatOps pack may not be installed or the rule may not be registered.
    echo Try to restart StackStorm first:
    echo
    echo st2ctl restart
    echo
    echo Then register the rule with:
    echo
    echo st2ctl reload --register-all
    echo
    exit 1
else
    echo Step 4: Chatops.notify rule is present.
fi

# Check that chatops.notify rule is enabled
if [ "0" = "$($st2 rule list | grep chatops.notify | grep True | wc -l)" ]; then
    echo Step 5 failed: Chatops.notify rule is present but disabled. Enable it with:
    echo
    echo st2 rule enable chatops.notify
    echo
    exit 1
else
    echo Step 5: Chatops.notify rule is enabled.
fi

echo
echo =======================================
echo
echo Everything seems to be fine!
echo
echo If you still run into trouble, try starting a Hubot shell with:
echo
echo docker exec -i hubot bash -c \"export HUBOT_ADAPTER=shell\; export EXPRESS_PORT=31337\; bin/hubot\"
echo
echo Send "!help" to check if there are StackStorm commands available.
echo If you get the right reply in the shell but not in your chat,
echo check your credentials.
echo
echo If something is still wrong, gist the output of "docker logs hubot"
echo and come see us in our Slack community: https://stackstorm.com/community-signup
echo

# TODO: Validate !help
# TODO: Validate loading from st2
# TODO: Post a sample message using chatops.post_message and check if that succeeded
