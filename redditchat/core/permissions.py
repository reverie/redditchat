# the signed room permission cookie code is deprecated

import functools

from common.tornado_cookies import get_secure_cookie, generate_secure_cookie
from core import cookies

class Perms(object):
    NONE = None
    READ = 'r'
    WRITE = 'w'

def _permission_level(user, room):
    """
    `user`'s permission level on `room`, ignoring cookies
    """
    if not user.is_authenticated():
        return Perms.READ
    else:
        return Perms.WRITE

def _get_cached_perm_level(request, cookie_name):
    perm = get_secure_cookie(request, cookie_name)
    if not perm:
        return
    assert perm in ('r', 'w')
    return perm

def _set_cached_perm_level(response, cookie_name, perm_level):
    assert perm_level in ('r', 'w')
    cookie_val = generate_secure_cookie(cookie_name, perm_level)
    response.set_cookie(cookie_name, cookie_val)

def _perm_level_satisfies(perm_val, perm_req):
    """
    If a user has permission level `perm_val`,
    and is requesting access level `perm_req`.
    """
    if perm_req == perm_val:
        return True
    if (perm_val == Perms.WRITE) and (perm_req == Perms.READ):
        return True
    return False

def get_permission(request, response, room, perm_req):
    """
    Returns True or False.
    Sets a cookie on the response object to cache
    the result, if necessary.
    """
    assert perm_req in (Perms.READ, Perms.WRITE)

    if cookies.has_cached_room_permission(
            room.shortname, 
            perm_req, 
            functools.partial(get_secure_cookie, request),
            session_key=request.session.session_key,
            uid=getattr(request.user, 'id', None)):
        return True

    # Cached permission does not satisfy requirement.
    perm_actual = _permission_level(request.user, room)
    if perm_actual == Perms.NONE:
        return False
    assert perm_actual in (Perms.READ, Perms.WRITE)
    result = _perm_level_satisfies(perm_actual, perm_req)
    cookie_name = cookies.room_cookie_name(room.shortname, session_key=request.session.session_key, uid=getattr(request.user, 'id', None))
    if result:
        _set_cached_perm_level(response, cookie_name, perm_actual)
    return result
