import mock
import json

from amqplib import client_0_8 as amqp

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import DatabaseError
from django.test.client import Client
from django.test import TestCase

from multiauth.models import MultiUser
from core.models import Room, Message

class ChatTest(TestCase):
    USERNAME = 'rossfan'
    PASSWORD = 'rossfanpw'
    EMAIL = 'testrunner@seddit.com'

    def setUp(self):
        self._amqp_old = (amqp.Connection, amqp.Message)
        amqp.Connection = mock.Mock()
        amqp.Message = mock.Mock()
        # TODO: 
        # -- fake FB CONNECT
        #settings.BROKER_VHOST = 'triggit_test'
        self.user = User.objects.create_user(self.USERNAME, self.EMAIL, password=self.PASSWORD)
        self.multiuser = MultiUser.from_set(auth_user=self.user)

        self.user2 = User.objects.create_user('bobross', 'testrunner@seddit.com', password='bobross')
        self.multiuser2 = MultiUser.from_set(auth_user=self.user2)

        self.auto_room = Room.objects.create(
                whitelist_mode = True,
                anonymous = True,
                auto_created = True
                )
        self.start_nrooms = Room.objects.count()

    def login(self):
        self.assertTrue(self.client.login(username=self.USERNAME, password=self.PASSWORD))

    def tearDown(self):
        amqp.Connection, amqp.Message = self._amqp_old

class RegTest(ChatTest):
    def test_basic(self):
        response = self.client.post('/d/register/', {
            'username': 'foo',
            'password': 'bar',
            'email': 'tests+foobar@seddit.com'
        })
        self.assertEqual(response.status_code, 200)
        response = json.loads(response.content)
        self.assertTrue(response['success'])

class SendTest(ChatTest):
    path = '/d/send/'

    def params(self):
        return {
            'room': self.auto_room.id,
            'msg': 'A fine chat message.'
        }

    def test_basic_send(self):
        self.auto_room.members.add(self.multiuser)
        self.login()
        response = self.client.post(self.path, self.params())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Message.objects.count(), 1)

    def test_nomembership_send(self):
        self.login()
        response = self.client.post(self.path, self.params())
        self.assertEqual(response.status_code, 603)
        self.assertEqual(Message.objects.count(), 0)

    def test_noauth_send(self):
        response = self.client.post(self.path, self.params())
        self.assertEqual(response.status_code, 603)
        self.assertEqual(Message.objects.count(), 0)

class IntBrokerTest(ChatTest):
    path = '/internal/broker/'

    def params(self):
        return {
            'anon': 0,
            'user_id_1': self.multiuser.id,
            'user_id_2': self.multiuser2.id,
            'SECRET_KEY': settings.SECRET_KEY,
            }

    def test_basic(self):
        response = self.client.post(self.path, self.params())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Room.objects.count(), self.start_nrooms + 1)
        r = Room.objects.order_by('-created_at')[0]
        self.assertFalse(r.title)
        self.assertFalse(r.locale)
        self.assertTrue(r.auto_created)
        self.assertTrue(r.whitelist_mode)
        self.assertFalse(r.account_type)
        self.assertFalse(r.anonymous)

    def test_nokey(self):
        params = self.params()
        params['SECRET_KEY'] += 'x'
        response = self.client.post(self.path, params)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Room.objects.count(), self.start_nrooms)

    def test_anon(self):
        params = self.params()
        params['anon'] = 1
        response = self.client.post(self.path, params)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Room.objects.count(), self.start_nrooms + 1)
        r = Room.objects.order_by('-created_at')[0]
        self.assertFalse(r.title)
        self.assertFalse(r.locale)
        self.assertTrue(r.auto_created)
        self.assertTrue(r.whitelist_mode)
        self.assertFalse(r.account_type)
        self.assertTrue(r.anonymous)

    def test_no_accts(self):
        params = self.params()
        params['anon'] = 1
        del params['user_id_1']
        del params['user_id_2']
        response = self.client.post(self.path, params)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Room.objects.count(), self.start_nrooms + 1)
        r = Room.objects.order_by('-created_at')[0]
        self.assertFalse(r.title)
        self.assertFalse(r.locale)
        self.assertTrue(r.auto_created)
        self.assertTrue(r.whitelist_mode)
        self.assertFalse(r.account_type)
        self.assertTrue(r.anonymous)
