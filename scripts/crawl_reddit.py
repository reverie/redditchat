"""
Crawl Reddit for moderator and subscriber # data and insert it into the database.
"""

from bs4 import BeautifulSoup
import datetime
import re
import time
import urllib3

from redditchat.core.models import Room

from script_log import make_logger, log

logger = make_logger('crawl_reddit')

def get_rooms_to_crawl():
    now = datetime.datetime.now()
    one_day_ago = now - datetime.timedelta(days=1)
    never_crawled = Room.objects.filter(last_crawled__isnull=True)
    not_crawled_today = Room.objects.exclude(last_crawled__isnull=True).filter(last_crawled__lt=one_day_ago)
    # Exclude Front Page:
    return (never_crawled | not_crawled_today).exclude(shortname='frontpage')

def crawl_room(room, http):
    """
    See if there's a subreddit corresponding to this room. If there is,
    fill in the model's moderator list, subscriber count, and shortname_display.
    """
    room.last_crawled = datetime.datetime.now()
    room.save() # Save immediately so even if it errors we don't try again too fast
    subreddit = room.shortname
    log(logger, 'debug', 'Crawling', subreddit)
    url = "http://www.reddit.com/r/%s/about/moderators/" % subreddit
    r = http.request('GET', url)
    if r.status != 200:
        if subreddit not in ['tester']:
            # We know that "tester" gives a 403 for whatever reason
            log(logger, 'error', 'Request got error:', r.status, "on url", url)
        return
    soup = BeautifulSoup(r.data)

    # Check whether subreddit exists:
    if soup.find(id='noresults'):
        r.moderators = r.subscribers = None
        room.save()
        return

    # Get display shortname
    title = soup.find(id='moderator-table').h1.text
    assert title.startswith('moderators of ')
    shortname_display = title.replace('moderators of ', '')
    room.shortname_display = shortname_display

    # Get number of subscribers
    number = soup.find('div', 'side').find('span', 'number').text
    number = int(re.sub('[^0-9]', '', number))
    room.subscribers = number

    # Get moderator list
    mods = soup.find(id='moderator-table').find_all('span', 'user')
    mods = [m.a.text for m in mods]
    room.moderators = mods

    # Get image URL
    room.image_url = soup.find(id='header-img').get('src') or room.image_url or ''

    # Shit we need another URL to get the title
    url = "http://www.reddit.com/r/%s/" % subreddit
    r = http.request('GET', url)
    if r.status != 200:
        log(logger, 'error', 'Request got error:', r.status, "on url", url)
        return
    soup = BeautifulSoup(r.data)
    room.title = soup.title.text

    # Write
    log(logger, 'debug', 'Setting', subreddit, 'to', room.to_dict())
    room.save()

def crawl_rooms(rooms):
    """
    Crawl rooms, giving enough delay that Reddit hopefully won't block us.
    (They ask 2 seconds between requests: https://github.com/reddit/reddit/wiki/API)
    """
    assert False, "Change this:"
    http = urllib3.PoolManager(headers={'User-Agent': 'Yourdomain.com - contact you@gmail.com'})
    for room in rooms:
        crawl_room(room, http)
        time.sleep(5)

def main():
    rooms_to_crawl = get_rooms_to_crawl()
    log(logger, 'debug', 'Got rooms to crawl:', rooms_to_crawl)
    crawl_rooms(rooms_to_crawl)
        

if __name__ == '__main__':
    main()
