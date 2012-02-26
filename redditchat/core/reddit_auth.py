import httplib
import json
import urllib
import urllib2
from cookielib import CookieJar

import socket 
socket.setdefaulttimeout(10) #seconds

REDDIT_AUTH_URL = "http://www.reddit.com/api/login"
LOGIN_SUCCESS_COOKIE_NAME = "reddit_session"

def reddit_auth(username, passwd):
    """
    Using a User's Reddit creds, see if Reddit.com auth
    succeeds, and return True or False.

    See: http://code.reddit.com/wiki/API#CorrectLogin
    """
    data = urllib.urlencode({'user':username, 'passwd': passwd})
    headers = {'User-Agent': 'Mozilla/5.0 Seddit.com -- Contact you@gmail.com'}
    request = urllib2.Request(REDDIT_AUTH_URL, data, headers)
    response = urllib2.urlopen(request)
    cookies = CookieJar()
    extracted = cookies.extract_cookies(response, request)
    cookie_names = [getattr(cookie, "name") for cookie in cookies]
    if LOGIN_SUCCESS_COOKIE_NAME in cookie_names:
        return True
    else:
        return False


