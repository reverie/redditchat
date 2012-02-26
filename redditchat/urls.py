from django.conf import settings
from django.conf.urls.defaults import *
from django.contrib import admin
from django.views.generic.simple import redirect_to

from root_dir import root_dir

admin.autodiscover()

urlpatterns = patterns('core.views',
    (r'^d/getauth/$', 'getauth'),
    (r'^d/register/$', 'register'),
    (r'^d/login/$', 'login'),
    (r'^d/getroom/$', 'getroom'),
    (r'^d/getrooms/$', 'getrooms'),
    (r'^d/mountaintop/$', 'mountaintop'),
    (r'^d/top10/$', 'top10'),
    (r'^d/roomsuggestions/$', 'roomsuggestions'),
    (r'^d/redditcode/$', 'redditcode'),
    (r'^d/verifyredditcodeposted/$', 'verifyredditcodeposted'),
    (r'^d/internal_auth/$', 'internal_auth'),

    (r'^about/verify/$', 'verify'),
    (r'^about/verify_email/$', 'verify_email'),

    (r'^d/test/$', 'test'),
)

urlpatterns += patterns('',
    (r'^adminnn/', include(admin.site.urls)),
)


#if settings.DEBUG:
#    urlpatterns += patterns('',
#        (r'^static/(?P<path>.*)$', 'django.views.static.serve',
#                {'document_root': root_dir('..', 'static')})
#        )
#
