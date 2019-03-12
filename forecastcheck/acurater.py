__all__ = ['FcastAnalysis']

import pdb
import math
from datetime import datetime, timedelta

from google.appengine.ext import ndb

from forecastcheck.ndb_setup import Weather, Observation, Forecast

class AveError(object):
	"""TODO"""
	def __init__(self, error=0.0, n=0):
		self.error = error
		self.n = n

	def __str__(self):
		return str(self.error)

	def __repr__(self):
		return 'AveError(error: {0.error}, n: {0.n})'.format(self) 

	def __add__(self, addend):
		if addend is not None:
			add_n = addend.n if isinstance(addend, AveError) else 1
			error = addend.error if isinstance(addend, AveError) else addend
			total_abs_error = self.error*self.n + abs(error)
			total_n = self.n + add_n
			return self if total_n is 0 else AveError(total_abs_error/total_n, total_n)
		else:
			return self

	def __sub__(self, subtrahend):
		if subtrahend is not None:
			sub_n = subtrahend.n if isinstance(subtrahend, AveError) else 1
			error = subtrahend.error if isinstance(subtrahend, AveError) else subtrahend
			total_abs_error = self.error*self.n - abs(error)
			if total_abs_error < 0:
				raise ValueError('AveError subtraction resulted in a negative total error.')
	 		total_n = self.n - sub_n
			return self if total_n is 0 else AveError(total_abs_error/total_n, total_n)
		else:
			return self

class Bias(object):
	"""TODO: docstring for Bias"""
	def __init__(self, bias=0.0, n=0):
		self.bias = bias
		self.n = n
		
	def __str__(self):
		return str(self.bias)

	def __repr__(self):
		return 'Bias(bias: {0.bias}, n: {0.n})'.format(self) 

	def __add__(self, addend):
		if addend is not None:
			add_n = addend.n if isinstance(addend, Bias) else 1
			bias = addend.bias if isinstance(addend, Bias) else addend
			total_bias = self.bias*self.n + bias
			total_n = self.n + add_n
			return self if total_n is 0 else Bias(total_bias/total_n, total_n)
		else:
			return self

	def __sub__(self, subtrahend):
		if subtrahend is not None:
			sub_n = subtrahend.n if isinstance(subtrahend, Bias) else 1
			bias = subtrahend.bias if isinstance(subtrahend, Bias) else subtrahend
			total_bias = self.bias*self.n - bias
	 		total_n = self.n - sub_n
			return self if total_n is 0 else Bias(total_bias/total_n, total_n)
		else:
			return self

class SimpleError(object):
	"""TODO: docstring for SimpleError"""
	def __init__(self, ave_error=None, bias=None):
		self.ave_error = ave_error or AveError()
		self.bias = bias or Bias()

	def __str__(self):
		return '{{error: {0.ave_error!s}, bias: {0.bias!s}}}'.format(self)

	def __repr__(self):
		return 'SimpleError({0.ave_error!r}, {0.bias!r})'.format(self)

	def __add__(self, addend):
		return SimpleError(self.ave_error + addend, self.bias + addend)

	def __sub__(self, subtrahend):
		return SimpleError(self.ave_error - subtrahend, self.bias - subtrahend)

class BinCount(object):
	"""TODO: Docstring for BinCount"""
	def __init__(self, bins=None):
		self.bins = bins if bins else {
			0: 0,
			10: 0,			
			20: 0,			
			30: 0,
			40: 0,
			50: 0,
			60: 0,
			70: 0,
			80: 0,
			80: 0,
			100: 0
		}
		self.n = sum(self.bins.values())

	def __str__(self):
		return str(self.bins)

	def __repr__(self):
		return 'BinCount(bins: {})'.format([(k, v) for k, v in sorted(self.bins.items())])

	def add(self, value):
		for bin_ in sorted(self.bins):
			if value <= bin_:
				self.bins[bin_] += 1
				self.n += 1
				return

	def remove(self, value):
		for bin_ in sorted(bins):
			if value <= bin_:
				self.bins[bin_] -= 1
				self.n -= 1
				return

class FcastAnalysis(object):
	"""TODO: docstring"""

	def __init__(self, start_t, end_t='9999-12-31T23:00:00', valid_lead_ds=range(1,8)):
		self.start_t = start_t
		self.end_t = end_t
		self.valid_lead_ds = valid_lead_ds
		self.obs = Observation.query(
			Observation.time >= start_t,
			Observation.time <= end_t
		).fetch()
		self._init_errors()
		self._analyze()

	def _init_errors(self):
		wx_simple_errors = (
			'temperature',
			'dewpoint',
			'precip_6hr',
			'wind_dir',
			'wind_speed'
		)
		self.errors = {}
		for day in self.valid_lead_ds:
			self.errors[day] = {}
			for prop in wx_simple_errors:
				self.errors[day][prop] = SimpleError()
			self.errors[day]['precip_chance'] = BinCount()

	def _analyze(self):
		for ob in self.obs:
			self.fcasts = Forecast.query(Forecast.valid_time == ob.time).fetch()
			for fcast in self.fcasts:
				self._get_simple_errors(ob, fcast)
				self._get_wind_errors(ob, fcast)
				self._analyze_precip_chance(ob, fcast)

	def _get_simple_errors(self, ob, fcast):	
		wx_error_fns = {
			'temperature': lambda ob, fcast: fcast - ob,
			'dewpoint': lambda ob, fcast: fcast - ob,
			'precip_6hr': lambda ob, fcast: fcast - ob if fcast + ob > 0 else None
		}
		for prop, func in wx_error_fns.items():
			ob_val = getattr(ob.observed_weather, prop)
			fcast_val = getattr(fcast.predicted_weather, prop)
			if fcast_val is not None:
				self.errors[fcast.lead_days][prop] += func(ob_val, fcast_val)
	
	def _get_wind_errors(self, ob, fcast):
		ob_speed = ob.observed_weather.wind_speed
		ob_dir = ob.observed_weather.wind_dir
		fcast_speed = fcast.predicted_weather.wind_speed
		fcast_dir = fcast.predicted_weather.wind_dir
		error_speed = fcast_speed - ob_speed
		if ob_speed > 0:
			# wind_dir observation is only valid if wind_speed > 0
			error_dir = fcast_dir - ob_dir
			if abs(error_dir) > 180:
				error_dir = error_dir - math.copysign(360, error_dir)
			self.errors[fcast.lead_days]['wind_dir'] += error_dir
		else:
			# Adjust for non-observation of low speed winds
			error_speed = 0.0 if fcast_speed < 1.6 else error_speed - 1.5
		self.errors[fcast.lead_days]['wind_speed'] += error_speed

	def _analyze_precip_chance(self, ob, fcast):
		precip_terms = ['drizzle', 'rain', 'sleet', 'snow', 'thunderstorm']
		precip_chance = fcast.predicted_weather.precip_chance
		if (any([ob.observed_weather.all_weather == term for term in precip_terms])):
			self.errors[fcast.lead_days]['precip_chance'].add(precip_chance)