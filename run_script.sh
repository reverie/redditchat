#!/bin/bash
#
# Takes care of this stuff:
#   1) Sets up Django environment variables
#   2) Supresses known warnings so that cron doesn't email us

# TODO: templatize from Fabfile?

PROJECT="redditchat"

# If the script moves this must be changed!
ROOT="$(dirname $0)"

SCRIPTS_DIR=$ROOT/scripts
PYTHON="/envs/redditchat/bin/python"

# Django environment
PYTHONPATH=$ROOT:$ROOT/redditchat; export PYTHONPATH
DJANGO_SETTINGS_MODULE=settings; export DJANGO_SETTINGS_MODULE
PATH=$PATH:/sbin; export PATH # needed for ejabberdctl

script_name=$1
shift 1;
args=$@

# Figure out debug settings
if [ $PROJECT_DEBUG ]; then
    DEBUG='-m pdb'
fi

# Supresses any DeprecationWarnings
$PYTHON -W "ignore::DeprecationWarning::0" $DEBUG $SCRIPTS_DIR/$script_name $args
