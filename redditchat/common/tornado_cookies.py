#!/usr/bin/env python
#
# Copyright 2009-2010 Facebook, Andrew Badr
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

"""Share secure cookies with a Tornado server."""

import base64
import hashlib
import hmac
import time

from django.conf import settings

def generate_secure_cookie(name, value):
    """
    Signs and timestamps a value so it cannot be forged. 
    
    Set the cookie from your Django code from the return
    value of this function.
    """
    timestamp = str(int(time.time()))
    value = base64.b64encode(value)
    signature = _cookie_signature(name, value, timestamp)
    value = "|".join([value, timestamp, signature])
    return value

def validate_cookie(name, value):
    parts = value.split("|")
    if len(parts) != 3: 
        return None
    signature = _cookie_signature(name, parts[0], parts[1])
    if not _time_independent_equals(parts[2], signature):
        #logging.warning("Invalid cookie signature %r", value)
        return None
    timestamp = int(parts[1])
    # What is this?
    if timestamp < time.time() - 31 * 86400:
        #logging.warning("Expired cookie %r", value)
        return None
    try:
        return base64.b64decode(parts[0])
    except:
        return None

def get_secure_cookie(request, name):
    """
    Returns the given signed cookie if it validates, or None.
    """
    # Convert to django:
    value = request.COOKIES.get(name)
    if value is None: 
        return None
    return validate_cookie(name, value)

def _cookie_signature(*parts):
    # Convert to django:
    hash = hmac.new(settings.SECRET_KEY,
                    digestmod=hashlib.sha1)
    for part in parts: hash.update(part)
    return hash.hexdigest()


def _time_independent_equals(a, b):
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0

