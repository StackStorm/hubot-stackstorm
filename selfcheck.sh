#!/bin/bash


docker="/usr/bin/sudo /usr/bin/docker"
st2="/usr/bin/st2"


failure="
===============================================

Uh oh! Something went wrong!

Please perform the steps outlined in the error message above
and then re-launch this script.

If you're still having trouble, gist the log files
and come see us in our Slack community:
\e[4mhttps://stackstorm.com/community-signup\e[0m

You can access Hubot logs with:
\e[1mdocker logs hubot\e[0m

StackStorm logs are stored in:
\e[1m/var/log/st2/\e[0m
"


success="
===============================================

\e[1mEverything seems to be fine!\e[0m

Hubot is working, StackStorm commands are loaded normally
and messages from StackStorm are getting through.

If you can't see the bot in your chat at this point,
the most probable cause is incorrect login credentials.

Check that your bot is using the right credentials to log in.
If you installed StackStorm with the All-In-One Installer,
the Hubot init script is located at:

\e[1m/etc/init.d/docker-hubot\e[0m

If you're still having trouble, gist the log files
and come see us in our Slack community:
\e[4mhttps://stackstorm.com/community-signup\e[0m

You can access Hubot logs with:
\e[1mdocker logs hubot\e[0m

StackStorm logs are stored in:
\e[1m/var/log/st2/\e[0m
"


echo
echo -e "Starting the Nine-Step Hubot Self-Check Program"
echo -e "==============================================="
echo


if [ "0" = "$($st2 action execute core.local cmd=echo 2>/dev/null | grep -c "execution get")" ]; then
    echo -e "\e[31mStackStorm client couldn't connect to StackStorm.\e[0m"
    echo
    echo -e "    Before you run the script you need to make sure"
    echo -e "    the StackStorm client can connect to the instance."
    echo
    echo -e "    Authenticate with your credentials:"
    echo -e "    \e[1mexport ST2_AUTH_TOKEN=\`st2 auth <username> -p <password> -t\`\e[0m"
    echo
    echo -e "    Check if you can connect to StackStorm:"
    echo -e "    \e[1mst2 action execute core.local cmd=echo\e[0m"
    echo -e "$failure"
    exit 1
fi


# Check if Hubot is installed and running
if [ "true" = "$($docker inspect --format='{{.State.Running}}' hubot 2>/dev/null)" ]; then
    echo -e "Step 1: Hubot is running."
else
    echo -e "\e[31mStep 1 failed: Hubot container is not running on this machine.\e[0m"
    echo
    echo -e "    Try launching it with:"
    echo
    echo -e "    \e[1mservice docker-hubot start\e[0m"
    echo
    echo -e "    If there's no \"docker-hubot\" service, then"
    echo -e "    your StackStorm installation could be outdated."
    echo -e "    Try reinstalling or running the update script:"
    echo
    echo -e "    \e[1msudo update-system\e[0m"
    echo -e "$failure"
    exit 1
fi


# Check if Hubot-stackstorm is installed
npm=$($docker exec -it hubot npm list 2>/dev/null | grep hubot-stackstorm | sed -r "s/.*\s(hubot.*)\\r/\1/")
if [ "0" = "$(echo "$npm" | wc -c)" ]; then
    echo -e "\e[31mStep 2 failed: Hubot-stackstorm is not installed inside the container.\e[0m"
    echo
    echo -e "    It's possible the container is outdated or corrupted."
    echo -e "    Try removing it and restarting the init script:"
    echo
    echo -e "    \e[1msudo service docker-hubot stop\e[0m"
    echo -e "    \e[1msudo docker rmi stackstorm/hubot\e[0m"
    echo -e "    \e[1msudo service docker-hubot start\e[0m"
    echo -e "$failure"
    exit 1
else
    echo -e "Step 2: Hubot-stackstorm is installed ($npm)."
fi


# Check if there are any enabled StackStorm aliases
if [ "0" = "$($st2 action-alias list -a enabled 2>/dev/null | grep -c True)" ]; then
    echo -e "\e[31mStep 3 failed: StackStorm doesn't seem to have registered and enabled aliases.\e[0m"
    echo
    echo -e "    Create one or install a sample pack with aliases."
    echo -e "    The \"st2\" pack would be a good example:"
    echo
    echo -e "    \e[1mst2 action execute packs.install packs=st2\e[0m"
    echo -e "$failure"
    exit 1
else
    echo -e "Step 3: StackStorm has aliases that are registered and enabled."
fi


# Check that chatops.notify rule is present
if [ "0" = "$($st2 rule list 2>/dev/null | grep -c chatops.notify)" ]; then
    echo -e "\e[31mStep 4 failed: Chatops.notify rule is not present.\e[0m"
    echo
    echo -e "    ChatOps pack may not be installed or the rule may not be registered."
    echo -e "    Try to restart StackStorm first:"
    echo
    echo -e "    \e[1mst2ctl restart\e[0m"
    echo
    echo -e "    Then register the rule with:"
    echo
    echo -e "    \e[1mst2ctl reload --register-all\e[0m"
    echo -e "$failure"
    exit 1
else
    echo -e "Step 4: Chatops.notify rule is present."
fi


# Check that chatops.notify rule is enabled
if [ "0" = "$($st2 rule list 2>/dev/null | grep chatops.notify | grep -c True)" ]; then
    echo -e "\e[31mStep 5 failed: Chatops.notify rule is present but disabled.\e[0m"
    echo
    echo -e "    Enable it with the following command:"
    echo
    echo -e "    \e[1mst2 rule enable chatops.notify\e[0m"
    echo -e "$failure"
    exit 1
else
    echo -e "Step 5: Chatops.notify rule is enabled."
fi


hubotlog=$({ echo -n; sleep 5; echo 'hubot help'; echo; sleep 2; } | $docker exec -i hubot bash -c "export HUBOT_ADAPTER=shell; export EXPRESS_PORT=31337; bin/hubot"; 2>/dev/null)


# Check that Hubot responds to help
if [ "0" = "$(echo "$hubotlog" | grep -c "help - Displays")" ]; then
    echo -e "\e[31mStep 6 failed: Hubot doesn't respond to the \"help\" command.\e[0m"
    echo
    echo -e "    Try reinstalling the container. This error shouldn't happen"
    echo -e "    unless the Hubot installation wasn't successful."
    echo
    echo -e "    \e[1msudo service docker-hubot stop\e[0m"
    echo -e "    \e[1msudo docker rmi stackstorm/hubot\e[0m"
    echo -e "    \e[1msudo service docker-hubot start\e[0m"
    echo -e "$failure"
    exit 1
else
    echo -e "Step 6: Hubot responds to the \"help\" command."
fi


# Check that hubot-stackstorm at least tried to load commands.
if [ "0" = "$(echo "$hubotlog" | grep -c "commands are loaded")" ]; then
    echo -e "\e[31mStep 7 failed: Hubot doesn't try to load commands from StackStorm.\e[0m"
    echo
    echo -e "    Try reinstalling the container and checking credentials."
    echo -e "    This error means the \"hubot-stackstorm\" plugin couldn't"
    echo -e "    load, connect to StackStorm or authenticate."
    echo
    echo -e "    \e[1msudo service docker-hubot stop\e[0m"
    echo -e "    \e[1msudo docker rmi stackstorm/hubot\e[0m"
    echo -e "    \e[1msudo service docker-hubot start\e[0m"
    echo -e "$failure"
    exit 1
else
    echo -e "Step 7: Hubot loads commands from StackStorm."
fi


channel=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
execution=$($($st2 action execute chatops.post_message channel="$channel" message="Debug. If you see this you're incredibly lucky but please ignore." 2>/dev/null | grep "execution get") 2>/dev/null)
hubotlogs=$($docker logs hubot | grep "$channel")


# Check that post_message is executed successfully.
if [ "0" = "$(echo "$execution" | grep -c "succeeded")" ]; then
    echo -e "\e[31mStep 8 failed: chatops.post_message doesn't work.\e[0m"
    echo
    echo -e "    Something is wrong with your StackStorm instance,"
    echo -e "    because \"chatops.post_message\" couldn't finish."
    echo
    echo -e "    Check StackStorm logs for more information."
    echo -e "$failure"
    exit 1
else
    echo -e "Step 8: chatops.post_message execution succeeded."
fi


# Check that post_message is getting through.
if [ "0" = "$(echo "$hubotlogs" | wc -l)" ]; then
    echo -e "\e[31mStep 9 failed: chatops.post_message hasn't been received.\e[0m"
    echo
    echo -e "    Try to check both Hubot and StackStorm logs for more information."
    echo -e "$failure"
    exit 1
else
    echo -e "Step 9: chatops.post_message has been received."
fi


echo -e "$success"
exit 0
