#!/bin/bash

docker="/usr/bin/sudo /usr/bin/docker"
st2="/usr/bin/st2"
status=0

echo
echo Starting the Nine-Step Hubot Self-Check Program
echo ===============================================
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
    status=1
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
    status=1
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
    status=1
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
    status=1
else
    echo Step 4: Chatops.notify rule is present.
fi

# Check that chatops.notify rule is enabled
if [ "0" = "$($st2 rule list | grep chatops.notify | grep True | wc -l)" ]; then
    echo Step 5 failed: Chatops.notify rule is present but disabled.
    echo
    echo Enable it with the following command:
    echo
    echo st2 rule enable chatops.notify
    status=1
else
    echo Step 5: Chatops.notify rule is enabled.
fi

hubotlog=$({ echo -n; sleep 5; echo 'hubot help'; echo; sleep 2; } | docker exec -i hubot bash -c "export HUBOT_ADAPTER=shell; export EXPRESS_PORT=31337; bin/hubot";)

# Check that chatops.notify rule is enabled
if [ "0" = "$(echo "$hubotlog" | grep "help - Displays" | wc -l)" ]; then
    echo Step 6 failed: Hubot doesn\'t respond to the "help" command.
    echo
    echo Try reinstalling the container. This error shouldn\'t happen
    echo unless the Hubot installation wasn\'t successful.
    echo
    echo sudo service docker-hubot stop
    echo sudo docker rmi stackstorm/hubot
    echo sudo service docker-hubot start
    status=1
else
    echo Step 6: Hubot responds to the "help" command.
fi

# Check that chatops.notify rule is enabled
if [ "0" = "$(echo "$hubotlog" | grep "help - Displays" | wc -l)" ]; then
    echo Step 6 failed: Hubot doesn\'t respond to the "help" command.
    echo
    echo Try reinstalling the container. This error shouldn\'t happen
    echo unless the Hubot installation wasn\'t successful.
    echo
    echo sudo service docker-hubot stop
    echo sudo docker rmi stackstorm/hubot
    echo sudo service docker-hubot start
    status=1
else
    echo Step 6: Hubot responds to the "help" command.
fi

# Check that hubot-stackstorm at least tried to load commands.
if [ "0" = "$(echo "$hubotlog" | grep "commands are loaded" | wc -l)" ]; then
    echo Step 6 failed: Hubot doesn\'t try to load commands from StackStorm.
    echo
    echo Try reinstalling the container. This error probably means
    echo that the "hubot-stackstorm" plugin couldn\'t load.
    echo
    echo sudo service docker-hubot stop
    echo sudo docker rmi stackstorm/hubot
    echo sudo service docker-hubot start
    status=1
else
    echo Step 7: Hubot loads commands from StackStorm.
fi

channel=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
execution=$($(st2 action execute chatops.post_message channel="$channel" message="Debug. If you see this you're incredibly lucky but please ignore." | grep "execution get"))
hubotlogs=$(docker logs hubot | grep "$channel")

# Check that post_message is executed successfully.
if [ "0" = "$(echo "$execution" | grep "succeeded" | wc -l)" ]; then
    echo Step 8 failed: chatops.post_message doesn\'t work.
    echo
    echo Something is wrong with your StackStorm instance,
    echo because "chatops.post_message" couldn\'t finish.
    echo
    echo Check StackStorm logs for more information.
    status=1
else
    echo Step 8: chatops.post_message succeeded.
fi

# Check that post_message is getting through.
if [ "0" = "$(echo "$hubotlogs" | wc -l)" ]; then
    echo Step 9 failed: chatops.post_message hasn\'t been received.
    echo
    echo Try to check both Hubot and StackStorm logs for more information.
    status=1
else
    echo Step 9: chatops.post_message has been received.
fi

if [ "0" = $(echo "$status") ]; then
    echo
    echo ===============================================
    echo
    echo Everything seems to be fine!
    echo
    echo Hubot is working, StackStorm commands are loaded normally
    echo and messages from StackStorm are getting through.
    echo
    echo If you can\'t see the bot in your chat,
    echo the most probable cause at this point is wrong credentials.
    echo
    echo Check that your bot is using the right credentials to log in.
    echo If you installed StackStorm with the All-In-One Installer,
    echo the Hubot init script is located at:
    echo
    echo /etc/init.d/docker-hubot
    echo
    echo If you\'re still having trouble, gist the log files
    echo and come see us in our Slack community:
    echo https://stackstorm.com/community-signup
    echo
    echo You can access Hubot logs with:
    echo docker logs hubot
    echo
    echo StackStorm logs are stored in:
    echo /var/log/st2/
    echo
    exit 0
else
    echo
    echo ===============================================
    echo
    echo Uh oh! Something went wrong!
    echo Please perform the steps outlined in the error message above
    echo and then re-launch this script.
    echo
    echo Please also make sure you can execute StackStorm commands
    echo with "st2", because the self-check script relies on it to work:
    echo
    echo st2 action execute core.local cmd=echo
    echo
    echo If you\'re still having trouble, gist the log files
    echo and come see us in our Slack community:
    echo https://stackstorm.com/community-signup
    echo
    echo You can access Hubot logs with:
    echo docker logs hubot
    echo
    echo StackStorm logs are stored in:
    echo /var/log/st2/
    echo
    exit 1
fi
