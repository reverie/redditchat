USER_INFO_COOKIE =  's_mu_info'
SECURE_SESSION_COOKIE = 'ssessionid'

def room_cookie_name(room_id, session_key=None, uid=None):
    id_part = str(uid or session_key)
    return str('room_' + id_part + '_' + room_id)

def _perm_from_cookie(cookie_name, perm, get_signed_cookie):
    cookie_val = get_signed_cookie(cookie_name)
    if cookie_val == perm:
        return True
    if (cookie_val == 'w') and (perm == 'r'):
        return True
    return False

def has_cached_room_permission(room_id, perm, get_signed_cookie, session_key=None, uid=None):
    assert perm in ('r', 'w')
    # Check twice so we can let authenticated users stay in their existing chats
    if uid:
        cookie_name = room_cookie_name(room_id, uid=uid)
        if _perm_from_cookie(cookie_name, perm, get_signed_cookie):
            return True
    cookie_name = room_cookie_name(room_id, session_key=session_key)
    return _perm_from_cookie(cookie_name, perm, get_signed_cookie)
