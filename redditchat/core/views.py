import collections
import datetime
import functools
import httplib
import itertools
import json
import random
import string

from django.conf import settings
from django.core.cache import cache
from django.contrib.auth.models import User
from django.http import Http404, HttpResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_view_exempt

from common import tornado_cookies
from common.views import req_render_to_response, json_result, json_response
from core.forms import RedditRegForm, RedditLoginForm
from core.permissions import get_permission
from core.models import Room
from lib import log

global_room = Room.objects.get(shortname='frontpage') # Created by fixture

CODE_CHARS = string.lowercase + string.digits

def ensure_csrf_cookie(view):
    """Our own version of this fxn until the official one gets released."""
    @functools.wraps(view)
    def wrapper(request, *args, **kwargs):
        request.META["CSRF_COOKIE_USED"] = True
        return view(request, *args, **kwargs)
    return wrapper

@ensure_csrf_cookie
@csrf_view_exempt
def getauth(request):
    from core.cookies import SECURE_SESSION_COOKIE
    # Get user info for response
    u = request.user
    if not u.is_authenticated():
        response = None
    else:
        response = {
            'remote_id': u.username
        }
    response = json_response(response)

    # Set session cookies
    request.session.set_test_cookie() # easy way to ensure session exists -- necessary?
    ss_val = tornado_cookies.generate_secure_cookie(SECURE_SESSION_COOKIE, request.session.session_key)
    response.set_cookie(SECURE_SESSION_COOKIE, ss_val)

    global_readable = get_permission(request, response, global_room, 'r')
    assert global_readable
    return response

def test(request):
    import pprint
    response = '\n\n\n'.join([
        pprint.pformat(request.COOKIES),
        pprint.pformat(request.META),
        pprint.pformat(request.session._session),
    ])
    response = HttpResponse(response, mimetype='text/plain')
    return response

@json_result
def register(request):
    f = RedditRegForm(request.POST)
    if f.is_valid():
        user = f.save(request)
        return {
            'success': True,
        }
    else:
        return {
            'success': False,
            'errors': f.errors,
        }

@json_result
def login(request):
    # TODO: factor out w/above
    f = RedditLoginForm(request.POST)
    if f.is_valid():
        user = f.save(request)
        return {
            'success': True,
        }
    else:
        return {
            'success': False,
            'errors': f.errors,
        }

#### Admin stuff

def date_range(from_date, to_date, step=datetime.timedelta(days=1)):
    # from http://www.ianlewis.org/en/python-date-range-iterator
    while from_date <= to_date:
        yield from_date
        from_date = from_date + step
    return
 
def get_counts(obj_iter, key_getter):
    """
    Assumes iterable is sorted by key. Returns a defaultdict
    of count of iterables with each key.
    """
    result = collections.defaultdict(int)
    for key, group in itertools.groupby(obj_iter, key_getter):
        result[key] = len(list(group))
    return result

def month_graph(data, start, end):
    """Helper for making graphy graph for a month's worth of data on something."""
    from pygooglechart import SimpleLineChart, Axis
    WIDTH, HEIGHT = 700, 200
    
    y_range = (0, max(max(data), 1)) # todo: have extra room when I figure out how to do labels (set_axis_positions?)
    x_range = (0, 30)
    chart = SimpleLineChart(WIDTH, HEIGHT, y_range=y_range, x_range=x_range)
    chart.add_data(data)
    chart.set_axis_labels(Axis.LEFT, y_range)
    #chart.left.labels = chart.left.label_positions = [0, max(data)]
    chart.set_axis_labels(Axis.BOTTOM, [d.strftime('%D') for d in
                                date_range(start, end, datetime.timedelta(days=10))])
    #chart.bottom.label_positions = [0, 10, 20, 30]
    return chart.get_url()
                                
def mountaintop(request):
    # Copied from ywot.views.admin
    if not request.user.is_authenticated():
        raise Http404
    if not request.user.is_superuser:
        raise Http404

    end = datetime.date.today()
    start = end - datetime.timedelta(days=30)
    
    # Make User Chart

    base_users = User.objects.all()

    new_users = base_users.filter(created_at__gte=start).order_by('created_at')

    count_by_date = get_counts(new_users, lambda x: x.created_at.date())
    prev_total = base_users.filter(created_at__lt=start).count()
    user_data = []
    user_cum_data = []
    for day in date_range(start, end):
        user_data.append(count_by_date[day])
        prev_total += count_by_date[day]
        user_cum_data.append(prev_total)
    user_chart_url = month_graph(user_data, start, end)
    user_cum_chart_url = month_graph(user_cum_data, start, end)
        
    # Make Chats Chart
    base_rooms = Room.objects.order_by('created_at')
    new_rooms = base_rooms.filter(created_at__gte=start)
    count_by_date = get_counts(new_rooms, lambda x: x.created_at.date())
    prev_total = base_rooms.filter(created_at__lt=start).count()
    room_data = []
    room_data_cum = []
    for day in date_range(start, end):
        room_data.append(count_by_date[day])
        prev_total += count_by_date[day]
        room_data_cum.append(prev_total)
    room_chart_url = month_graph(room_data, start, end)
    room_cum_chart_url = month_graph(room_data_cum, start, end)
    
    return req_render_to_response(request, 'admin/stats.html', {
        'users': base_users.count(),
        'users_today': base_users.filter(created_at__gte=end).count(),
        'user_chart_url': user_chart_url,
        'user_cum_chart_url': user_cum_chart_url,
        'private_rooms': base_rooms.count(),
        'private_rooms_today': base_rooms.filter(created_at__gte=end).count(),
        'room_chart_url': room_chart_url,
        'room_cum_chart_url': room_cum_chart_url,
        })

#### End admin stuff

def getroom(request):
    """Gets info for the given room, from `title` param."""
    shortname = request.GET['shortname']
    room, _ =  Room.get_or_create_by_shortname(shortname)
    return json_response(room.to_dict())

def getrooms(request):
    """Gets info for the given rooms, from `rids` params."""
    rids = json.loads(request.GET['rids'])
    result = {}
    for shortname in rids:
        room, _ = Room.get_or_create_by_shortname(shortname)
        result[room.shortname] = room.to_dict()
    return json_response(result)

@cache_page(60*60*24) # Cache for a day
def reddit_room_suggestions(request):
    top9 = (Room.objects
                .order_by('-subscribers') # only the best
                .exclude(subscribers__isnull=True) # Rooms that aren't subreddits
                .exclude(shortname='') # Already included by default
                .exclude(shortname__in=['blog', 'announcements']) # Lame!
                )[:9]
            #.exclude([:10])
    top10 = [global_room] + list(top9)
    result = [r.to_dict() for r in top10]
    return json_response(result)

@ensure_csrf_cookie
@csrf_view_exempt
def roomsuggestions(request):
    """
    Top N Reddit rooms for all users, Logged in or not.
    """
    return reddit_room_suggestions(request)

@ensure_csrf_cookie
@csrf_view_exempt
def redditcode(request):
    code = ''.join([random.choice(CODE_CHARS) for x in xrange(16)])
    return json_response({
        'code': code,
        'sig': tornado_cookies.generate_secure_cookie('code', code)
    })

def get_reddit_content():
    import json
    CACHE_KEY = 'reddit-content-1'
    content = cache.get(CACHE_KEY)
    if content:
        return content
    path = settings.REDDITCHAT_AUTH_THREAD + '.json'
    conn = httplib.HTTPConnection('www.reddit.com', timeout=10)
    conn.request('GET', path, headers={'User-Agent': 'Mozilla/5.0 Seddit.com -- Contact you@gmail.com'})
    resp = conn.getresponse()
    assert resp.status == 200
    result = resp.read()
    conn.close()
    try:
        result = json.loads(result)
    except json.JSONDecodeError:
        raise ValueError("Unknown response format")
    cache.set(CACHE_KEY, content, 30)
    return result


@json_result
def verifyredditcodeposted(request):
    code = request.POST['code']
    sig = request.POST['sig']
    if code != tornado_cookies.validate_cookie('code', sig):
        log.error("verifyredditcodeposted signature failed with (code, sig)", code, sig)
        raise ValueError('Invalid signature')
    content = get_reddit_content()
    comments = content[1]['data']['children']
    comments_with_code = []
    for c in comments:
        try:
            if code in c['data']['body']:
                comments_with_code.append(c)
        except KeyError:
            log.debug("verifyredditcodeposted could not parse comment", c)
            continue
    if not comments_with_code:
        log.debug("verifyredditcodeposted found no comment with code", code)
        return dict(success=False)
    comments_with_code.sort(key=lambda x:x['data']['created_utc'])
    original_comment = comments_with_code[0]
    username = original_comment['data']['author']
    return dict(success=True, 
                username=username,
                usersig=tornado_cookies.generate_secure_cookie('username', username))

@csrf_view_exempt
def internal_auth(request):
    username = request.POST['username']
    password = request.POST['password']
    f = RedditLoginForm(request.POST)
    return json_response(f.is_valid())
