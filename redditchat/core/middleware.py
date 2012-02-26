from common import tornado_cookies

from core.cookies import USER_INFO_COOKIE

class SignedAuthMiddleware(object):
    def process_response(self, request, response):
        if not hasattr(request, 'user'):
            # Can happen on redirects?
            return response
        if request.user.is_authenticated():
            u = request.user
            value = ','.join(['auth', str(u.id), u.username])
            value = tornado_cookies.generate_secure_cookie(USER_INFO_COOKIE, value)
            response.set_cookie(USER_INFO_COOKIE, value)
        else:
            response.delete_cookie(USER_INFO_COOKIE)
        return response
