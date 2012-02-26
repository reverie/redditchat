"""
Match XMPP affiliations in Mnesia to Reddit's moderators.

MUC rooms correspond to subreddits. A user is added as an admin in the room
if they are a moderator of the subreddit.
"""

import re
import subprocess

from redditchat.core.models import Room
from redditchat.stagesettings import XMPP_DOMAIN, XMPP_MUC_DOMAIN

from script_log import make_logger, log

logger = make_logger('set_room_affiliations')

ME = 'badr'
OWNER = 'owner'
ADMIN = 'admin'

def ejabberdctl_command(args):
    args = ["ejabberdctl"] + args
    p = subprocess.Popen(args, stdout=subprocess.PIPE)
    assert not p.wait()
    return p.stdout.read()

def get_online_rooms():
    """List of all online room JIDs."""
    args = ["muc_online_rooms", XMPP_DOMAIN]
    result = ejabberdctl_command(args)
    return result.split()

def is_subreddit_room(rjid):
    """whether `rjid` could potentially correspond to a subreddit, as opposed to a testing or invalidly created room"""
    node, host = rjid.split('@')
    assert host == XMPP_MUC_DOMAIN
    if node.lower() == 'frontpage':
        # Ignore the frontpage room
        return False
    subreddit_format = '^[a-zA-Z0-9_]*$'
    return re.match(subreddit_format, node)

def get_mnesia_affiliations(node):
    """A dictionary mapping usernames to affiliations for the room with JID `rjid`."""
    args = ["get_room_affiliations", node, XMPP_MUC_DOMAIN]
    result = ejabberdctl_command(args)
    affiliation_lines = filter(None, result.split('\n')) # There's a blank one at the end
    result = {}
    for al in affiliation_lines:
        username, host, affil = al.split()
        assert host == XMPP_DOMAIN
        result[username] = affil
    return result

def get_room_by_node(node):
    """The Django Room instance corresponding to `rjid`."""
    return Room.objects.get(shortname=node)

def set_room_affiliation(username, room_node, affiliation):
    log(logger, 'debug', 'Setting room affiliation:', username, room_node, affiliation)
    user_jid = (username + '@' + XMPP_DOMAIN).lower()
    args = ["set_room_affiliation", room_node, XMPP_MUC_DOMAIN, user_jid, affiliation]
    ejabberdctl_command(args)

def main():
    room_jids = get_online_rooms()
    log(logger, 'debug', 'Online jids:', room_jids)
    room_jids = filter(is_subreddit_room, room_jids)
    log(logger, 'debug', 'Valid online jids:', room_jids)
    for rjid in room_jids:
        room_node, room_host = rjid.split('@')
        assert room_host == XMPP_MUC_DOMAIN
        affiliations = get_mnesia_affiliations(room_node)
        # Make me owner
        if affiliations.get(ME) != OWNER:
            set_room_affiliation(ME, room_node, OWNER)
        # Make moderators admins
        try:
            room = get_room_by_node(room_node)
        except Room.DoesNotExist:
            # Some rooms may not be in the DB. User created (hax),
            # or our DB got emptied.
            continue
        reddit_mods = room.get_reddit_moderators()
        log(logger, 'debug', 'Current affiliations for room:', room.title, affiliations)
        log(logger, 'debug', 'Found mods for room:', room.title, reddit_mods)
        # TODO: don't set again if already set
        for mod_username in reddit_mods:
            set_room_affiliation(mod_username, room_node, ADMIN)

if __name__ == '__main__':
    log(logger, 'debug', "set_room_affiliations starting")
    main()
    log(logger, 'debug', "set_room_affiliations done")
