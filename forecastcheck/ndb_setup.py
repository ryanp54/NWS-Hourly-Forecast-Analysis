""" Setup ndb models."""
__all__ = ['RawForecast', 'RawObservation', 'Weather', 'Observation', 'Forecast', 'RecordError']

from google.appengine.ext import ndb

class _ConvIntegerProperty(ndb.IntegerProperty):
    """Define special converting IntegerProperty.
    
    Override _validate to convert float to int if rounding error is low.
    """
    def _validate(self, value):
        coerced_value = int(round(value))
        if abs(coerced_value - value) < 0.001:
            return coerced_value
        else:
            RecordError(error_message='Invalid int received for ConvInteger: ' + str(value))
            return None

class RawForecast(ndb.Model):
    """Model to hold raw forecast JSON."""
    date = ndb.StringProperty() # Date forecast was made
    forecast = ndb.JsonProperty()

class RawObservation(ndb.Model):
    """Model to hold raw forecast JSON."""
    date = ndb.StringProperty() # Date forecast was made
    observation = ndb.JsonProperty()

class Weather(ndb.Model):
    """Model to hold various weather properties.

    Use as StructuredProperty in Forecast and Observation.
    Attribute cloud_cover is integer in Forecast, but string in
    Observation.
    """
    
    weather = ndb.StringProperty('w')
    all_weather = ndb.StringProperty('aw')
    temperature = ndb.FloatProperty('t')
    dewpoint = ndb.FloatProperty('d')
    cloud_cover = ndb.GenericProperty('cc')
    precip_1hr = ndb.FloatProperty('p1')
    precip_6hr = ndb.FloatProperty('p6')
    precip_chance = _ConvIntegerProperty('pc')
    wind_dir = _ConvIntegerProperty('wd')
    wind_speed = ndb.FloatProperty('ws')

class Forecast(ndb.Model):
    """Model to hold hourly weather forecast."""
    predicted_weather = ndb.StructuredProperty(Weather, 'pw')
    valid_time = ndb.StringProperty('t')
    made = ndb.StringProperty('ot')
    lead_days = ndb.IntegerProperty('d')

class Observation(ndb.Model):
    """Model to hold weather observation.

    nws_parse expects entities to be created with id=time.
    time attribute is included for complex queries not supported by
    keys by default.
    """
    time = ndb.StringProperty('t')
    observed_weather = ndb.StructuredProperty(Weather, 'ow')

class RecordError(ndb.Model):
    """Model to record error message."""
    error_message = ndb.StringProperty()
