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
		return '{0.__dict__}'.format(self) 

	def __add__(self, addend):
		if addend is not None:
			add_n = addend.n if isinstance(addend, AveError) else 1
			error = addend.error if isinstance(addend, AveError) else addend
			total_abs_error = self.error*self.n + abs(error)
			total_n = self.n + add_n
			return self if total_n == 0 else AveError(total_abs_error/total_n, total_n)
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
			return self if total_n == 0 else AveError(total_abs_error/total_n, total_n)
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
		return '{0.__dict__}'.format(self) 

	def __add__(self, addend):
		if addend is not None:
			add_n = addend.n if isinstance(addend, Bias) else 1
			bias = addend.bias if isinstance(addend, Bias) else addend
			total_bias = self.bias*self.n + bias
			total_n = self.n + add_n
			return self if total_n == 0 else Bias(total_bias/total_n, total_n)
		else:
			return self

	def __sub__(self, subtrahend):
		if subtrahend is not None:
			sub_n = subtrahend.n if isinstance(subtrahend, Bias) else 1
			bias = subtrahend.bias if isinstance(subtrahend, Bias) else subtrahend
			total_bias = self.bias*self.n - bias
	 		total_n = self.n - sub_n
			return self if total_n == 0 else Bias(total_bias/total_n, total_n)
		else:
			return self

class Accuracy(object):
	"""TODO: docstring for Accuracy"""
	def __init__(self, correct_range=1, accuracy=0.0, n=0):
		self.correct_range = correct_range
		self.accuracy = accuracy
		self.n = n

	def __str__(self):
		return str(self.accuracy)

	def __repr__(self):
		return '{0.__dict__}'.format(self) 
	
	def __add__(self, addend):
		if isinstance(addend, Accuracy):
			n = self.n + addend.n
			accuracy = (self.accuracy + addend.accuracy)/n
			return Accuracy(self.correct_range, accuracy, n)
		elif addend is not None:
			n = self.n + 1
			if abs(addend) < self.correct_range:
				accuracy = (self.accuracy*self.n + 1)/n
			else:
				accuracy = self.accuracy*self.n/n
			return Accuracy(self.correct_range, accuracy, n)
		else:
			return self

	def __sub__(self, subtrahend):
		if isinstance(subtrahend, Accuracy):
			n = self.n + subtrahend.n
			accuracy = (self.accuracy + subtrahend.accuracy)/n
			return Accuracy(self.correct_range, accuracy, n)
		elif subtrahend is not None:
			n = self.n - 1
			if abs(subtrahend) < self.correct_range:
				accuracy = (self.accuracy*self.n - 1)/n
			else:
				accuracy = self.accuracy*self.n/n
			return Accuracy(self.correct_range, accuracy, n)
		else:
			return self

class SimpleError(object):
	"""TODO: docstring for SimpleError"""
	def __init__(self, ave_error=None, bias=None, accuracy=None, accuracy_range=1.0):
		self.ave_error = ave_error or AveError()
		self.bias = bias or Bias()
		self.accuracy = accuracy or Accuracy(accuracy_range)

	def __str__(self):
		return '{{error: {0.ave_error!s}, bias: {0.bias!s}, accuracy: {0.accuracy!r}}}'.format(self)

	def __repr__(self):
		return '{0.__dict__}'.format(self)

	def __add__(self, addend):
		return SimpleError(
			self.ave_error + addend, self.bias + addend, self.accuracy + addend)

	def __sub__(self, subtrahend):
		return SimpleError(
			self.ave_error - subtrahend, self.bias - subtrahend, self.accuracy - subtrahend)

class BinCount(object):
	"""TODO: Docstring for BinCount"""
	def __init__(self, bins=None, predicted_n=0.0):
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
		self._ob_n = sum(self.bins.values())
		self._predicted_n = predicted_n

	def __str__(self):
		return str(self.bins)

	def __repr__(self):
		return "{{'bin_count': {{'bins': {0}, 'bias': {1}}}}}".format(
			{'{}'.format(k): v for k, v in sorted(self.bins.items())}, self.bias())

	def reg_ob(self, value):
		self.reg_predicted(value)
		for bin_ in sorted(self.bins):
			if value <= bin_:
				self.bins[bin_] += 1
				self._ob_n += 1
				break

	def rem_ob(self, value):
		self.rem_predicted(value)
		for bin_ in sorted(bins):
			if value <= bin_:
				self.bins[bin_] -= 1
				self._ob_n -= 1
				break

	def reg_predicted(self, value):
		self._predicted_n += value/100.0

	def rem_predicted(self, value):
		self._predicted_n -= value/100.0

	def bias(self):
		return self._predicted_n/self._ob_n if self._ob_n != 0 else 0

class FcastAnalysis(object):
	"""TODO: docstring"""

	def __init__(self, start_t, end_t='9999-12-31', valid_lead_ds=range(1,8)):
		self.start_t = start_t + 'T00:00:00'
		self.end_t = end_t + 'T23:00:00'
		self.valid_lead_ds = valid_lead_ds
		self.obs = Observation.query(
			Observation.time >= start_t,
			Observation.time <= end_t
		).fetch()
		self._init_errors()
		self.data = {'obs': [], 'fcasts': {'{}'.format(i): [] for i in range(1,8)}, 'errors': self.errors}
		self._analyze()

	def _init_errors(self):
		wx_simple_errors = {
			'temperature': {'accuracy_range': 1.67},
			'dewpoint': {'accuracy_range': 1.67},
			'precip_6hr': {'accuracy_range': 2.54},
			'cloud_cover': {'accuracy_range': 1},
			'wind_dir': {'accuracy_range': 45},
			'wind_speed': {'accuracy_range': 1.34}
		}
		self.errors = {}
		for day in self.valid_lead_ds:
			self.errors[day] = {}
			for prop, kwargs in wx_simple_errors.items():
				self.errors[day][prop] = SimpleError(**kwargs)
			self.errors[day]['precip_chance'] = BinCount()

	def _analyze(self):
		for ob in self.obs:
			self.fcasts = Forecast.query(Forecast.valid_time == ob.time).fetch()
			for fcast in self.fcasts:
				self.data['obs'].append(ob.to_dict())
				self.data['fcasts'][str(fcast.lead_days)].append(fcast.to_dict())
				self._get_simple_errors(ob, fcast)
				self._get_wind_errors(ob, fcast)
				self._analyze_precip_chance(ob, fcast)

	def _get_simple_errors(self, ob, fcast):	
		wx_error_fns = {
			'temperature': lambda ob, fcast: fcast - ob,
			'dewpoint': lambda ob, fcast: fcast - ob,
			'precip_6hr': lambda ob, fcast: fcast - (ob*1000) if fcast + ob > 0 else None,
			'cloud_cover': self._get_cloud_cover_error
		}
		for prop, func in wx_error_fns.items():
			ob_val = getattr(ob.observed_weather, prop)
			fcast_val = getattr(fcast.predicted_weather, prop)
			if fcast_val is not None and ob_val is not None:
				self.errors[fcast.lead_days][prop] += func(ob_val, fcast_val)
	
	def _get_wind_errors(self, ob, fcast):
		ob_speed = ob.observed_weather.wind_speed
		if ob_speed is not None:
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

	def _get_cloud_cover_error(self, ob, fcast):
		cc_categories = {
			'VV': {'val': -1, 'okta': {'min': 0.75, 'max': 8}},
			'CLR': {'val': 0, 'okta': {'min': 0, 'max': 2.5}},
			'SCT': {'val': 1, 'okta': {'min': 0.75, 'max': 5}},
			'BKN': {'val': 2, 'okta': {'min': 3.5, 'max': 7.5}},
			'OVC': {'val': 3, 'okta': {'min': 6.5, 'max': 8}},
		}
		ob_layers = [cc_categories[layer] for layer in ob.split(', ')]
		layers_max = max(ob_layers, key=lambda cc: cc['val'])
		fcast_okta = fcast/12.5
		# Handle special 'VV' case.
		if layers_max == -1:
			return 0 if fcast_okta >= 0.75 else 1
		# Assign the forecasted category in a way that minimizes the
		# error amount to avoid over punishing edge cases
		if fcast_okta < layers_max['okta']['min']:
			for category in sorted(cc_categories.values(), key=lambda cat: -cat['val']):
				if fcast_okta >= category['okta']['min']:
					error = category['val'] - layers_max['val']
					break
		elif fcast_okta > layers_max['okta']['max']:
			for category in sorted(cc_categories.values(), key=lambda cat: cat['val']):
				if fcast_okta <= category['okta']['max']:
					error = category['val'] - layers_max['val']
					break
		else:
			error = 0
		return error

	def _analyze_precip_chance(self, ob, fcast):
		precip_terms = ['drizzle', 'rain', 'sleet', 'snow', 'thunderstorm', 'unknown']
		precip_chance = fcast.predicted_weather.precip_chance
		wx_obs = ob.observed_weather.all_weather
		if wx_obs is not None:
			wx_obs = wx_obs.split(', ')
			precip_obs = [any([wx_ob == term for term in precip_terms]) for wx_ob in wx_obs]
			if any(precip_obs):
				self.errors[fcast.lead_days]['precip_chance'].reg_ob(precip_chance)
			else:
				self.errors[fcast.lead_days]['precip_chance'].reg_predicted(precip_chance)
