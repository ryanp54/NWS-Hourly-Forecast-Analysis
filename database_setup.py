import os
import sys
import pdb

from google.appengine.ext import ndb

class ConvIntegerProperty(ndb.IntegerProperty):
    def _validate(self, value):
        coerced_value = int(round(value))
        if abs(coerced_value - value) < 0.001:
            return coerced_value
        else:
            RecordError(error_message='Invalid int received for ConvInteger: ' + str(value))
            return None

class RawForecast(ndb.Model):
    date = ndb.StringProperty()
    forecast = ndb.JsonProperty()

class Weather(ndb.Model):
    weather = ndb.StringProperty('w')
    all_weather = ndb.StringProperty('aw')
    temperature = ndb.FloatProperty('t')
    dewpoint = ndb.FloatProperty('d')
    cloud_cover = ndb.GenericProperty('cc')
    precip_1hr = ndb.FloatProperty('p1')
    precip_6hr = ndb.FloatProperty('p6')
    precip_chance = ConvIntegerProperty('pc')
    wind_dir = ConvIntegerProperty('wd')
    wind_speed = ndb.FloatProperty('ws')

class Forecast(ndb.Model):
    predicted_weather = ndb.StructuredProperty(Weather, 'pw')
    valid_time = ndb.StringProperty('t')
    made = ndb.StringProperty('ot')
    lead_days = ndb.IntegerProperty('d')

class Observation(ndb.Model):
    time = ndb.StringProperty('t')
    observed_weather = ndb.StructuredProperty(Weather, 'ow')

class RecordError(ndb.Model):
    error_message = ndb.StringProperty()