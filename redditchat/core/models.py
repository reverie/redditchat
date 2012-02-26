import re

from django.contrib.auth.models import User
from django.db import models

from picklefield.fields import PickledObjectField

from common.models import BaseModel

class Room(BaseModel):
    shortname = models.CharField(max_length=256, unique=True) # must be normalized (only lowercase ASCII letters and _)
    shortname_display = models.CharField(max_length=256) # may have caps (but still only letters and _)
    title = models.TextField() # Null for auto-created rooms

    # Reddit data
    last_crawled = models.DateTimeField(null=True)
    moderators = PickledObjectField(null=True)
    subscribers = models.IntegerField(null=True)
    image_url = models.CharField(max_length=256, blank=True)

    def __unicode__(self):
        return "Room %s" % self.id

    def get_reddit_moderators(self):
        """List of Reddit usernames of corresponding subreddit (if any)'s moderators."""
        return self.moderators or []

    def to_dict(self):
        return {
            'id': self.shortname,
            'shortname': self.shortname,
            'shortname_display': self.shortname_display,
            'title': self.title,
            'image_url': self.image_url
        }

    @staticmethod
    def normalize_shortname(shortname):
        forbidden_chars = '[^a-zA-Z0-9_]'
        shortname_display = re.sub(forbidden_chars, '', shortname)
        shortname = shortname_display.lower() # Gets indexed
        return shortname, shortname_display

    @classmethod
    def get_or_create_by_shortname(cls, shortname, defaults=None):
        defaults = defaults or {}
        shortname, shortname_display =  cls.normalize_shortname(shortname)
        defaults['shortname_display'] = shortname_display
        return cls.objects.get_or_create(shortname=shortname, defaults=defaults)

    @classmethod
    def get_by_shortname(cls, shortname):
        shortname, _ =  cls.normalize_shortname(shortname)
        return cls.objects.get(shortname=shortname)
