# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Removing unique constraint on 'Room', fields ['title']
        db.delete_unique('core_room', ['title'])

        # Deleting field 'Room.account_type'
        db.delete_column('core_room', 'account_type')

        # Deleting field 'Room.anonymous'
        db.delete_column('core_room', 'anonymous')

        # Deleting field 'Room.locale'
        db.delete_column('core_room', 'locale')

        # Deleting field 'Room.whitelist_mode'
        db.delete_column('core_room', 'whitelist_mode')

        # Deleting field 'Room.auto_created'
        db.delete_column('core_room', 'auto_created')

        # Deleting field 'Room.public_readable'
        db.delete_column('core_room', 'public_readable')

        # Adding field 'Room.shortname'
        db.add_column('core_room', 'shortname', self.gf('django.db.models.fields.CharField')(default='', unique=True, max_length=256), keep_default=False)

        # Removing M2M table for field members on 'Room'
        db.delete_table('core_room_members')

        # Changing field 'Room.title'
        db.alter_column('core_room', 'title', self.gf('django.db.models.fields.TextField')(default=''))


    def backwards(self, orm):
        
        # Adding field 'Room.account_type'
        db.add_column('core_room', 'account_type', self.gf('django.db.models.fields.TextField')(null=True), keep_default=False)

        # Adding field 'Room.anonymous'
        db.add_column('core_room', 'anonymous', self.gf('django.db.models.fields.BooleanField')(default=True), keep_default=False)

        # Adding field 'Room.locale'
        db.add_column('core_room', 'locale', self.gf('django.db.models.fields.TextField')(null=True), keep_default=False)

        # Adding field 'Room.whitelist_mode'
        db.add_column('core_room', 'whitelist_mode', self.gf('django.db.models.fields.BooleanField')(default=False), keep_default=False)

        # Adding field 'Room.auto_created'
        db.add_column('core_room', 'auto_created', self.gf('django.db.models.fields.BooleanField')(default=False), keep_default=False)

        # Adding field 'Room.public_readable'
        db.add_column('core_room', 'public_readable', self.gf('django.db.models.fields.BooleanField')(default=False), keep_default=False)

        # Deleting field 'Room.shortname'
        db.delete_column('core_room', 'shortname')

        # Adding M2M table for field members on 'Room'
        db.create_table('core_room_members', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('room', models.ForeignKey(orm['core.room'], null=False)),
            ('user', models.ForeignKey(orm['auth.user'], null=False))
        ))
        db.create_unique('core_room_members', ['room_id', 'user_id'])

        # Changing field 'Room.title'
        db.alter_column('core_room', 'title', self.gf('django.db.models.fields.TextField')(unique=True, null=True))

        # Adding unique constraint on 'Room', fields ['title']
        db.create_unique('core_room', ['title'])


    models = {
        'core.room': {
            'Meta': {'object_name': 'Room'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('common.fields.UUIDField', [], {'auto': 'True', 'unique': 'True', 'max_length': '32', 'primary_key': 'True'}),
            'shortname': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '256'}),
            'title': ('django.db.models.fields.TextField', [], {}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['core']
