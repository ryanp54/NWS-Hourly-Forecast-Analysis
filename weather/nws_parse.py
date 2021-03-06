"""For use recording NWS forecast and observation data.

This module contains 2 classes for parsing and recording a common
group of weather properties found in NWS API data:
"""

__all__ = ['GridData', 'ObservationData']

from datetime import datetime, timedelta

from google.appengine.ext import ndb

from weather.ndb_setup import (RawObservation, Weather, Observation,
                               Forecast, RecordError)


class GridData(object):
    """Parse forecast data into hourly NDB Forecast entities.

    Takes the value of the 'properties' property from the NWS
    gridpoints forecast endpoint to instantiate. The to_ndb method
    can then be called to parse and put the data to NDB entities.
    Ideally, data should have an updateTime close to 00:00 UTC.
    Different timing may lead to less than 24 hourly forecasts being
    available for first or seventh days.

    Attributes:
        made_t (datetime): Last time forecast was updated.
        start_d (datetime): First day to be forecast.
        end_t (datetiem): End of forecast day 7 or end of data.
        data (dict): JSON data.
    """

    # Tuples for converting props in the form (JSON prop, NDB prop)
    _props_to_ndb = frozenset((
        ('temperature', 'temperature'),
        ('dewpoint', 'dewpoint'),
        ('skyCover', 'cloud_cover'),
        ('quantitativePrecipitation', 'precip_6hr'),
        ('probabilityOfPrecipitation', 'precip_chance'),
        ('weather', 'all_weather'),
        ('windDirection', 'wind_dir'),
        ('windSpeed', 'wind_speed')))

    def __init__(self, grid_data):
        data_end = _get_start_and_end_t(grid_data['validTimes'])[1]
        made_t = _iso2datetime(grid_data['updateTime'])
        self.made_t = made_t

        # Round start_d forward to noon or midnight
        self.start_d = datetime(made_t.year, made_t.month, made_t.day, 12)
        self.start_d += timedelta(days=0.5*round(made_t.hour/24.0))

        self.end_t = self.start_d + timedelta(days=7)
        if self.end_t > data_end:
            self.end_t = data_end

        self.data = grid_data

    def _init_Forecasts(self):
        """Create empty NDB entities to add Weather props to later."""
        time_range = (self.end_t - self.start_d)
        hours = time_range.days*24 + time_range.seconds/3600
        self.ndb_forecasts = {}

        for i in range(hours):
            cur_time = (self.start_d + timedelta(hours=i)).isoformat()
            lead_days = (24 + i)/24
            self.ndb_forecasts[cur_time] = Forecast(
                valid_time=cur_time,
                made=self.made_t.isoformat(),
                lead_days=lead_days,
                predicted_weather=Weather())

    def _crawl_forecast(self):
        for prop_js, prop_ndb in GridData._props_to_ndb:
            if prop_ndb == 'precip_6hr':
                self._crawl_precip(prop_js, prop_ndb)
            else:
                self._crawl_prop(prop_js, prop_ndb)

    def _crawl_precip(self, prop_js, prop_ndb):
        """
        Record all 6-hour precip amount forecasts. Also track 3-hour
        precip to record if a subsequent 3-hour precip forecasts occurs.
        """
        precip_3hr = {'value': 0.0, 'valid_t_iso': None}
        for val in self.data[prop_js]['values']:
            start_t, end_t = _get_start_and_end_t(val['validTime'])
            hours = (end_t - start_t).seconds/3600
            ndb_forecast = self.ndb_forecasts.get(end_t.isoformat())

            if ndb_forecast:
                weather = ndb_forecast.predicted_weather
            else:
                continue

            if hours == 6:
                weather.precip_6hr = val['value']
            elif hours == 3:
                if end_t.hour % 6 != 0:
                    precip_3hr['value'] = val['value']
                    precip_3hr['valid_t_iso'] = end_t.isoformat()
                elif start_t.isoformat() == precip_3hr['valid_t_iso']:
                    weather.precip_6hr = val['value'] + precip_3hr['value']

    def _crawl_prop(self, prop_js, prop_ndb):
        for val in self.data[prop_js]['values']:
            if prop_ndb == 'all_weather':
                val['value'] = _concat_weather(val['value'])

            start_t, end_t = _get_start_and_end_t(val['validTime'])
            while start_t < end_t:
                if start_t.isoformat() in self.ndb_forecasts:
                    weather = self.ndb_forecasts[
                        start_t.isoformat()].predicted_weather
                    setattr(weather, prop_ndb, val['value'])

                start_t += timedelta(hours=1)

    def to_ndb(self):
        """ Parse and put NDB Forecasts to the Datastore.

        Returns:
            A list of the Keys of the entities that were put.
         """
        self._init_Forecasts()
        if len(self.ndb_forecasts) != 168:
            error_message = 'Incomplete Forecast on ' + self.made_t.isoformat()
            RecordError(error_message=error_message).put()

        self._crawl_forecast()

        return ndb.put_multi(self.ndb_forecasts.values())


class ObservationData(object):
    """Parse observation data into hourly NDB Forecast entities.

    Takes the value of the 'features' property from the NWS
    stations observations endpoint to instantiate. Optionally can
    include the most recent Observation in NDB if it has already been
    retrieved. The to_ndb method can then be called to parse and put
    the data to NDB entities.

    Attributes:
        last_ndb_time (datetime): Time of most recent Observation
        data (dict): JSON data.
    """

    @staticmethod
    def last_ndb_time():
        """Return datetime of most recent Observation in NDB"""
        last_ob = Observation.query().order(-Observation.time).get()
        return _iso2datetime(last_ob.time) if last_ob else datetime(1, 1, 1)

    def __init__(self, observation_data):
        self.data = observation_data

    def _crawl_hourly_obs(self):
        """Record only observations from the top of the hour."""
        self.ndb_obs = []
        for ob in self.data:
            time = _iso2datetime(ob['id'].split('/')[-1])
            minutes = time.minute
            if minutes > 45:
                hour = time + timedelta(hours=1) - timedelta(minutes=minutes)
            elif minutes < 15:
                hour = time - timedelta(minutes=minutes)
            else:
                hour = None

            if hour and need_obs(hour):
                ob['properties']['time'] = hour
                self.ndb_obs.append(_to_Observation(ob['properties']))

    def put_raw(self):
        """Put RawObservation to Datastore."""
        raw = RawObservation(date=datetime.today().isoformat()[0:10],
                             observation=self.data)
        raw.put()

    def to_ndb(self):
        """Parse and put NDB Observations.

        Returns:
            List of the Keys for entities that were put.
        """
        self._crawl_hourly_obs()

        return ndb.put_multi(self.ndb_obs)


# # # Helper functions for parsing NWS station observation data # # #


def _to_Observation(ob):
    time = ob['time'].isoformat()
    return Observation(
        # Include time as both id and prop for expanded retrival options
        # w/out custom indexes
        id=time,
        time=time,
        observed_weather=Weather(
            weather=ob['textDescription'],
            all_weather=_parse_multiple(ob['presentWeather'], 'weather'),
            temperature=ob['temperature']['value'],
            dewpoint=ob['dewpoint']['value'],
            cloud_cover=_parse_multiple(ob['cloudLayers'], 'amount'),
            precip_1hr=_null2zero(ob['precipitationLastHour']['value']),
            precip_6hr=_parse_6hr_precip(ob),
            wind_dir=ob['windDirection']['value'],
            wind_speed=ob['windSpeed']['value']
        )
    )


def _parse_multiple(records, prop_name):
    """Return comma delineated list of record values."""
    values = ''
    for record in records:
        values = values + record[prop_name] + ', '

    return values[0:-2] if values else None


def _parse_6hr_precip(ob):
    if ob['time'].hour % 6 == 0:
        return _null2zero(ob['precipitationLast6Hours']['value'])
    else:
        return -1


def need_obs(hour):
    ob = Observation.get_by_id(hour.isoformat())
    return ob is None


# # # Helper function for parsing NWS grid forecast data # # #


def _parse_duration(duration):
    """Convert NWS duration string to timedelta.

    Args:
        duration (str): NWS GridData duration.

    Returns:
        Equivalent timedelta object.
    """
    raw_dayshours = duration.split('/P')[1].split('T')
    days = _null2zero(raw_dayshours[0].strip('D'))
    hours = raw_dayshours[1].strip('H') if len(raw_dayshours) > 1 else 0

    return timedelta(days=int(days), hours=int(hours))


def _get_start_and_end_t(nws_iso_str):
    """Return equvalent datetime objects for the start and end time of
    a NWS iso time str that includes duration information.
    """
    time_str, duration_str = nws_iso_str.split('+')
    start_time = _iso2datetime(time_str)
    end_time = start_time + _parse_duration(duration_str)

    return start_time, end_time


def _concat_weather(entries):
    """Make a plain english string from a list of dictionaries whose
    entries describe the forecasted weather.

    Args:
        entries (list): a value of one of the values from the weather
            property of the NWS grid data.

    Returns:
        The entries converted to a string.

    """
    result = ''
    for entry in entries:
        for key in ['coverage', 'intensity', 'weather']:
            val = entry[key]
            if val:
                result += ' ' + val
        result += ','

    # Return result with leading space and trailing comma removed
    return result[1:-1]


# # # General helper functions # # #


def _iso2datetime(iso_str):
    """Return equavalent datetime object for iso time str passed in."""

    # Remove timezone info and any decimal value present at end of str.
    iso_str = iso_str.split('+')[0].split('.')[0]

    return datetime.strptime(iso_str, '%Y-%m-%dT%H:%M:%S')


def _null2zero(val):
    return val if val else 0
