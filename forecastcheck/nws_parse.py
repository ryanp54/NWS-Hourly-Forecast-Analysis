import pdb

from datetime import datetime, timedelta

from google.appengine.ext import ndb

from forecastcheck.ndb_setup import RawForecast, Weather, Observation, Forecast, RecordError

class GridData(object):
	"""Todo: Document"""
	props_to_ndb = frozenset((
		('temperature', 'temperature'),
		('dewpoint', 'dewpoint'),
		('skyCover', 'cloud_cover'),
		('quantitativePrecipitation', 'precip_6hr'),
		('probabilityOfPrecipitation', 'precip_chance'),
		('windDirection', 'wind_dir'),
		('windSpeed', 'wind_speed')))

	def __init__(self, grid_data):
		data_end = get_start_and_end_t(grid_data['validTimes'])[1]
		made_time = iso2datetime(grid_data['updateTime'])
		self.start_d = datetime(made_time.year, made_time.month, made_time.day)
		self.made_t = made_time
		if made_time.hour > 12:
			self.start_d += timedelta(days=1)
		self.end_t = self.start_d + timedelta(days=7)
		if self.end_t < data_end:
			self.end_t = data_end
		self.data = grid_data

	def init_Forecasts(self):
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

		return self.ndb_forecasts

	def crawl_hourlies(self):
		for key, prop in GridData.props_to_ndb:
			for val in self.data[key]['values']:
				start_t, end_t = get_start_and_end_t(val['validTime'])
				while start_t < end_t:
					if start_t.isoformat() in self.ndb_forecasts:
						weather = self.ndb_forecasts[
							start_t.isoformat()].predicted_weather
						setattr(weather, prop, val['value'])
					start_t += timedelta(hours=1)

	def to_ndb(self):
		self.init_Forecasts()
		self.crawl_hourlies()
		ndb.put_multi(self.ndb_forecasts.values())
		return self.ndb_forecasts.keys()

class ObservationData(object):
	"""Todo: Document"""
	@staticmethod
	def last_ndb_time():	
		last_ob = Observation.query().order(-Observation.time).get()
		return iso2datetime(last_ob.time) if last_ob else datetime(1,1,1)

	def __init__(self, observation_data, last_ndb_time=None):
		if last_ndb_time == None:
			last_ndb_time = self.last_ndb_time()
		
		self.last_ndb_t = last_ndb_time
		self.obs_data = observation_data

	def crawl_hourly_obs(self):
		self.ndb_obs = []
		for ob in self.obs_data:
			hour = filter2hourly(ob)
			if hour and hour > self.last_ndb_t:
				ob['properties']['time'] = hour
				self.ndb_obs.append(to_Observation(ob['properties']))

	def to_ndb(self):
		self.crawl_hourly_obs()
		keys = ndb.put_multi(self.ndb_obs)
		return map(lambda key: key.id(), keys)


def to_Observation(ob):
	time = ob['time'].isoformat()
	return Observation(
		# Use time as id as well for economical querying
		id = time,
		time = time,
		observed_weather = Weather(
			weather = ob['textDescription'],
			all_weather = parse_multiple(ob['presentWeather'], 'weather'),
			temperature = ob['temperature']['value'],
			dewpoint = ob['dewpoint']['value'],
			cloud_cover = parse_multiple(ob['cloudLayers'], 'amount'),
			precip_1hr = null2zero(ob['precipitationLastHour']['value']),
			precip_6hr = parse_6hr_precip(ob),
			wind_dir = ob['windDirection']['value'],
			wind_speed = ob['windSpeed']['value']
		)
	)

# Utility functions for parsing NWS station observation data

def parse_multiple(records, prop_name):
	values = ''
	for record in records:
		values = values + record[prop_name] + ', '
	
	return values[0:-2] if len(values) > 0 else None

def parse_6hr_precip(ob):
	if ob['time'].hour % 6 == 0:
		return null2zero(ob['precipitationLast6Hours']['value'])
	else:
		return -1

def filter2hourly(ob):
	time = iso2datetime(ob['id'].split('/')[-1])
	minutes = time.minute
	if minutes > 45:
		time = time + timedelta(hours=1) - timedelta(minutes=minutes)
	elif minutes < 15:
		time = time - timedelta(minutes=minutes)
	else:
		time = False
	
	return time

# Utility function for parsing NWS grid forecast data

def parse_duration(duration_str):
	days_and_hours = duration_str.split('/P')[1].split('T')
	days = null2zero(days_and_hours[0].strip('D'))
	hours = days_and_hours[1].strip('H') if len(days_and_hours) > 1 else 0
	return timedelta(days=int(days), hours=int(hours))

def get_start_and_end_t(nws_iso_str):
	time_str, duration_str = nws_iso_str.split('+')
	start_time = iso2datetime(time_str)
	end_time = start_time + parse_duration(duration_str)
	return start_time, end_time

# General utility functions

def iso2datetime(iso_str):
	# Remove any unwanted addition information
	iso_str = iso_str.split('+')[0].split('.')[0]

	return datetime.strptime(iso_str, '%Y-%m-%dT%H:%M:%S')

def null2zero(val):
	return val if val else 0