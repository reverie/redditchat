# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Adding field 'Room.image_url'
        db.add_column('core_room', 'image_url', self.gf('django.db.models.fields.CharField')(default='', max_length=256, blank=True), keep_default=False)


    def backwards(self, orm):
        
        # Deleting field 'Room.image_url'
        db.delete_column('core_room', 'image_url')


    models = {
        'core.room': {
            'Meta': {'object_name': 'Room'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('common.fields.UUIDField', [], {'auto': 'True', 'unique': 'True', 'max_length': '32', 'primary_key': 'True'}),
            'image_url': ('django.db.models.fields.CharField', [], {'max_length': '256', 'blank': 'True'}),
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
