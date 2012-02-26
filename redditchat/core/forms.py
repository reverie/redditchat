import re

from django import forms
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User

from common import tornado_cookies
from reddit_auth import reddit_auth

username_re = '[a-zA-Z0-9_]{3,16}$'

class RegForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField()
    email = forms.EmailField()

    def clean_username(self):
        data = self.cleaned_data['username'].lower()
        try:
            u = User.objects.get(username=data)
        except User.DoesNotExist:
            pass
        else:
            raise forms.ValidationError, 'Username is already taken'
        if not re.match(username_re, data):
            raise forms.ValidationError, 'Username must be an alphanumeric string 3-16 letters long.'
        return data

    def clean_email(self):
        data = self.cleaned_data['email'].lower()
        try:
            u = User.objects.get(email=data)
        except User.DoesNotExist:
            pass
        else:
            raise forms.ValidationError, 'Email address is already taken'
        return data

    def save(self, request):
        username = self.cleaned_data['username']
        password = self.cleaned_data['password']
        u = User(username=username, email=self.cleaned_data['email'], is_active=False) # is_active means confirmed email address
        u.set_password(password)
        u.save()
        user = authenticate(username=username, password=password)
        login(request, user)
        return user

class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField()

    def clean_username(self):
        data = self.cleaned_data['username'].lower()
        try:
            User.objects.get(username=data)
        except User.DoesNotExist:
            raise forms.ValidationError, 'Username not found.'
        return data

    def clean(self):
        if ('username' not in self.cleaned_data) or ('password' not in self.cleaned_data):
            # Just... give... up...
            return self.cleaned_data
        username = self.cleaned_data['username']
        password = self.cleaned_data['password']
        user = authenticate(username=username, password=password)
        if user is None:
            raise forms.ValidationError("Invalid password.")
        if not user.is_active:
            raise forms.ValidationError('You must <a href="/about/verify_email/?username=%s" target="_blank">verify your email address</a> before logging in.' % username)
        self.user = user
        return self.cleaned_data

    def save(self, request):
        login(request, self.user)
        return self.user

class RedditRegForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField()
    usersig = forms.CharField()

    def clean(self):
        username = self.cleaned_data['username']
        usersig = self.cleaned_data['usersig']
        if username != tornado_cookies.validate_cookie('username', usersig):
            raise forms.ValidationError('Invalid signature -- please start over :(')
        return self.cleaned_data

    def save(self, request):
        username = self.cleaned_data['username']
        password = self.cleaned_data['password']
        u, _ = User.objects.get_or_create(username=username, email='you+redditchat@gmail.com', is_active=True)
        u.set_password(password)
        u.save()
        user = authenticate(username=username, password=password)
        login(request, user)
        return user

class RedditLoginForm(forms.Form):
    """
    Tries username and password against first our database,
    then Reddit's authentication API.
    """
    username = forms.CharField()
    password = forms.CharField()

    def clean(self):
        if ('username' not in self.cleaned_data) or ('password' not in self.cleaned_data):
            # Just... give... up...
            return self.cleaned_data
        username = self.cleaned_data['username']
        password = self.cleaned_data['password']
        MSG = "Invalid Reddit.com password. Or, Reddit's API is being flakey again, in which case click Sign Up above."
        try:
            user = User.objects.get(username=username)
            password_ok = user.check_password(password)
            if not password_ok: #now handle new Reddit user (from existing Seddit user), or if user changed Reddit password:
                try:
                    reddit_login_success = reddit_auth(username, password) 
                except:
                    reddit_login_success = False
                if reddit_login_success:
                    user.set_password(password)
                    user.save()
                else:
                    raise forms.ValidationError("Invalid password. Try setting a new one by clicking Sign Up above.")
        except User.DoesNotExist:
            reddit_login_success = reddit_auth(username, password)
            if reddit_login_success:
                u = User(username=username, email='you+redditchat@gmail.com', is_active=True)
                u.set_password(password)
                u.save()
            else:
                raise forms.ValidationError(MSG)
        user = authenticate(username=username, password=password)
        self.user = user
        return self.cleaned_data

    def save(self, request):
        login(request, self.user)
        return self.user
