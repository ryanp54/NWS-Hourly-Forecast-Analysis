__all__ = ['ave_fcast_error']

import pdb
from datetime import datetime, timedelta

from google.appengine.ext import ndb

from forecastcheck.ndb_setup import Weather, Observation, Forecast

weather_props = frozenset((
	'temperature',
	'dewpoint',
	'precip_6hr',
	'wind_dir',
	'wind_speed'
))

class AveDiff(object):
	"""TODO"""
	def __init__(self, diff=0.0, n=0):
		self.diff = diff
		self.n = n

	def __str__(self):
		return str(self.diff)

	def __repr__(self):
		return 'AveDiff(diff: {}, n: {})'.format(self.diff, self.n) 

	def __add__(self, addend):
		add_n = addend.n if isinstance(addend, AveDiff) else 1
		add_diff = addend.diff if isinstance(addend, AveDiff) else addend
		total_diff = self.diff*self.n + add_diff
		total_n = self.n + add_n
		return AveDiff(total_diff/total_n, total_n)

	def __sub__(self, subtrahend):
		sub_n = subtrahend.n if isinstance(subtrahend, AveDiff) else 1
		sub_diff = subtrahend.diff if isinstance(subtrahend, AveDiff) else subtrahend
		total_diff = self.diff*self.n - sub_diff
		if total_diff < 0:
			raise ValueError('AveDiff subtraction resulted in a negative total difference.')
 		total_n = self.n - sub_n
		return AveDiff(total_diff/total_n, total_n)
			
 

def ave_fcast_error(start_t, end_t=datetime(9999,12,31), valid_lead_ds=range(1,8)):
	obs = Observation.query(
		Observation.time >= start_t.isoformat(),
		Observation.time <= end_t.isoformat()
	).fetch()
	ave_diffs = {}
	for day in valid_lead_ds:
		for prop in weather_props:
			ave_diffs[day][prop] = AveDiff()

	for ob in obs:
		forecasts = Forecast.query(Forecast.valid_time == ob.time).fetch()
		for forecast in forecasts:
			for prop in weather_props:
				ob_val = getattr(ob.observed_weather, prop)
				fcast_val = getattr(forecast.predicted_weather, prop)
				ave_diffs[forecast.lead_days][prop] += abs(ob_val - fcast_val)

	return ave_diffs