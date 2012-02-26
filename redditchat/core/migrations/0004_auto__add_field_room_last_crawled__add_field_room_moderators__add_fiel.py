# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Adding field 'Room.last_crawled'
        db.add_column('core_room', 'last_crawled', self.gf('django.db.models.fields.DateTimeField')(null=True), keep_default=False)

        # Adding field 'Room.moderators'
        db.add_column('core_room', 'moderators', self.gf('picklefield.fields.PickledObjectField')(null=True), keep_default=False)

        # Adding field 'Room.subscribers'
        db.add_column('core_room', 'subscribers', self.gf('django.db.models.fields.IntegerField')(null=True), keep_default=False)


    def backwards(self, orm):
        
        # Deleting field 'Room.last_crawled'
        db.delete_column('core_room', 'last_crawled')

        # Deleting field 'Room.moderators'
        db.delete_column('core_room', 'moderators')

        # Deleting field 'Room.subscribers'
        db.delete_column('core_room', 'subscribers')


    models = {
        'core.room': {
            'Meta': {'object_name': 'Room'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('common.fields.UUIDField', [], {'auto': 'True', 'unique': 'True', 'max_length': '32', 'primary_key': 'True'}),
            'last_crawled': ('django.db.models.fields.DateTimeField', [], {'null': 'True'}),
            'moderators': ('picklefield.fields.PickledObjectField', [], {'null': 'True'}),
            'shortname': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '256'}),
            'shortname_display': ('django.db.models.fields.CharField', [], {'max_length': '256'}),
            'subscribers': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['core']
