# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Adding field 'Room.shortname_display'
        db.add_column('core_room', 'shortname_display', self.gf('django.db.models.fields.CharField')(default='', max_length=256), keep_default=False)


    def backwards(self, orm):
        
        # Deleting field 'Room.shortname_display'
        db.delete_column('core_room', 'shortname_display')


    models = {
        'core.room': {
            'Meta': {'object_name': 'Room'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('common.fields.UUIDField', [], {'auto': 'True', 'unique': 'True', 'max_length': '32', 'primary_key': 'True'}),
            'shortname': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '256'}),
            'shortname_display': ('django.db.models.fields.CharField', [], {'max_length': '256'}),
            'title': ('django.db.models.fields.TextField', [], {}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['core']
