__all__ = ['FcastAnalysis']

import pdb
import math
import copy
from datetime import datetime, timedelta

from google.appengine.ext import ndb

from forecastcheck.ndb_setup import Weather, Observation, Forecast

MM_PER_M = 1000


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
            total_abs_error = self.error*self.n + abs(error)*add_n
            total_n = self.n + add_n
            return self if total_n == 0 else AveError(
                total_abs_error/total_n, total_n)
        else:
            return self

    def __sub__(self, subtrahend):
        if subtrahend is not None:
            is_ave_error = isinstance(subtrahend, AveError)
            sub_n = subtrahend.n if is_ave_error else 1
            error = subtrahend.error if is_ave_error else subtrahend
            total_abs_error = self.error*self.n - abs(error)*sub_n
            if total_abs_error < 0:
                raise ValueError(
                    'AveError subtraction resulted in a negative total error.')
            total_n = self.n - sub_n
            return self if total_n == 0 else AveError(
                total_abs_error/total_n, total_n)
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
            total_bias = self.bias*self.n + bias*add_n
            n = self.n + add_n
            return self if n == 0 else Bias(total_bias/n, n)
        else:
            return self

    def __sub__(self, subtrahend):
        if subtrahend is not None:
            is_bias = isinstance(subtrahend, Bias)
            sub_n = subtrahend.n if is_bias else 1
            bias = subtrahend.bias if is_bias else subtrahend
            total_bias = self.bias*self.n - bias*sub_n
            n = self.n - sub_n
            return Bias() if n == 0 else Bias(total_bias/n, n)
        else:
            return self


class Accuracy(object):
    """TODO: docstring for Accuracy"""
    def __init__(self, error_threshold=1, accuracy=0.0, n=0):
        self.error_threshold = error_threshold
        self.accuracy = accuracy
        self.n = n

    def __str__(self):
        return str(self.accuracy)

    def __repr__(self):
        return '{0.__dict__}'.format(self)

    def __add__(self, addend):
        if isinstance(addend, Accuracy):
            n = self.n + addend.n
            if n > 0:
                accuracy = (self.accuracy*self.n + addend.accuracy*addend.n)/n
            else:
                accuracy = self.accuracy
            return Accuracy(self.error_threshold, accuracy, n)
        elif addend is not None:
            n = self.n + 1
            if abs(addend) < self.error_threshold:
                accuracy = (self.accuracy*self.n + 1)/n
            else:
                accuracy = self.accuracy*self.n/n
            return Accuracy(self.error_threshold, accuracy, n)
        else:
            return self

    def __sub__(self, subtrahend):
        if isinstance(subtrahend, Accuracy):
            n = self.n - subtrahend.n
            if n == 0:
                accuracy = 0.0
            else:
                accuracy = (self.accuracy*self.n
                            - subtrahend.accuracy*subtrahend.n)/n
        elif subtrahend is not None:
            n = self.n - 1
            if n == 0:
                accuracy = 0.0
            elif abs(subtrahend) < self.error_threshold:
                accuracy = (self.accuracy*self.n - 1)/n
            else:
                accuracy = self.accuracy*self.n/n
        else:
            return self

        return Accuracy(self.error_threshold, accuracy, n)


class SimpleError(object):
    """TODO: docstring for SimpleError"""
    def __init__(
        self,
        ave_error=None,
        bias=None,
        accuracy=None,
        error_threshold=1.0
    ):
        self.ave_error = ave_error or AveError()
        self.bias = bias or Bias()
        self.accuracy = accuracy or Accuracy(error_threshold)

    def __str__(self):
        return (
            '{{error: {0.ave_error!s},'
            ' bias: {0.bias!s},'
            ' accuracy: {0.accuracy!r}}}'
        ).format(self)

    def __repr__(self):
        return '{0.__dict__}'.format(self)

    def __add__(self, addend):
        if isinstance(addend, SimpleError):
            new_value = SimpleError(
                self.ave_error + addend.ave_error,
                self.bias + addend.bias,
                self.accuracy + addend.accuracy
            )
        else:
            new_value = SimpleError(
                self.ave_error + addend,
                self.bias + addend,
                self.accuracy + addend
            )
        return new_value

    def __sub__(self, subtrahend):
        if isinstance(subtrahend, SimpleError):
            new_value = SimpleError(
                self.ave_error - subtrahend.ave_error,
                self.bias - subtrahend.bias,
                self.accuracy - subtrahend.accuracy
            )
        else:
            new_value = SimpleError(
                self.ave_error - subtrahend,
                self.bias - subtrahend,
                self.accuracy - subtrahend
            )
        return new_value


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
            {'{}'.format(k): v for k, v in sorted(self.bins.items())},
            self.bias()
        )

    def reg_ob(self, value):
        self.reg_predicted(value)
        for bin_ in sorted(self.bins):
            if value <= bin_:
                self.bins[bin_] += 1
                self._ob_n += 1
                break

    def rem_ob(self, value):
        self.rem_predicted(value)
        for bin_ in sorted(self.bins):
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
    wx_types = {
        'temperature': {
            'prop_name': 'temperature',
            'display_name': 'Temperature',
            'units': 'degrees C'
        },
        'dewpoint': {
            'prop_name': 'dewpoint',
            'display_name': 'Dewpoint',
            'units': 'degrees C'
        },
        'precip_6hr': {
            'prop_name': 'precip_6hr',
            'display_name': '6-Hour Precipitation Amount',
            'units': 'mm'
        },
        'cloud_cover': {
            'prop_name': 'cloud_cover',
            'display_name': 'Cloud Cover',
            'units': '%'
        },
        'wind_dir': {
            'prop_name': 'wind_dir',
            'display_name': 'Wind Direction',
            'units': 'degrees '
        },
        'wind_speed': {
            'prop_name': 'wind_speed',
            'display_name': 'Wind Speed',
            'units': 'knts'
        },
        'precip_chance': {
            'prop_name': 'precip_chance',
            'display_name': 'Precipitation Chance',
            'units': '%'
        },
    }

    def __init__(self, start_t, end_t='9999-12-31', valid_lead_ds=range(1, 8)):
        obs = Observation.query(
            Observation.time >= start_t,
            Observation.time <= end_t
        ).fetch()

        self.analyses = self._init_analyses(valid_lead_ds)
        self._analyze(obs)

    def _init_analyses(self, valid_lead_ds):
        defaultStats = {
            'temperature': SimpleError(error_threshold=1.67),
            'dewpoint': SimpleError(error_threshold=1.67),
            'precip_6hr': SimpleError(error_threshold=2.54),
            'cloud_cover': SimpleError(error_threshold=1),
            'wind_dir': SimpleError(error_threshold=45),
            'wind_speed': SimpleError(error_threshold=1.34),
            'precip_chance': BinCount()
        }

        analyses = {}
        for wx_type, data in self.wx_types.items():
            analyses[wx_type] = {
                'obs': {},
                'metadata': data,
                'lead_days': {},
                'cumulative_stats': defaultStats.get(wx_type, SimpleError())
            }

            for lead_day in valid_lead_ds:
                analyses[wx_type]['lead_days'][lead_day] = {
                    'stats': defaultStats.get(wx_type, SimpleError()),
                    'fcasts': {}
                }

        return analyses

    def _analyze(self, obs):
        wx_error_fns = {
            'temperature': lambda ob, fcast: fcast - ob,
            'dewpoint': lambda ob, fcast: fcast - ob,
            'precip_6hr': lambda ob, fcast: (
                fcast - (ob*MM_PER_M) if fcast + ob > 0 else None
            ),
            'cloud_cover': self._get_cloud_cover_error
        }

        for ob in obs:
            valid_fcasts = Forecast.query(
                Forecast.valid_time == ob.time
            ).fetch()

            for wx_type in wx_error_fns.keys():
                ob_val = getattr(ob.observed_weather, wx_type)
                self.analyses[wx_type]['obs'][ob.time] = ob_val

                leaddays_obj = self.analyses[wx_type]['lead_days']
                for fcast in valid_fcasts:
                    fcast_val = getattr(fcast.predicted_weather, wx_type)
                    leaddays_obj[fcast.lead_days]['fcasts'][fcast.valid_time] = fcast_val

                    if fcast_val is not None and ob_val is not None:
                        error_val = wx_error_fns[wx_type](ob_val, fcast_val)
                        leaddays_obj[fcast.lead_days]['stats'] += error_val
                        self.analyses[wx_type]['cumulative_stats'] += error_val

            self._get_wind_errors(ob, valid_fcasts)
            # TODO: Recfactor these as well to work with new structure
            # self._analyze_precip_chance(ob_val, fcast_val, wx_type)

    def _get_wind_errors(self, ob, fcasts):
        ob_speed = ob.observed_weather.wind_speed
        if ob_speed is not None:
            for fcast in fcasts:
                ob_dir = ob.observed_weather.wind_dir
                fcast_speed = fcast.predicted_weather.wind_speed
                fcast_dir = fcast.predicted_weather.wind_dir
                error_speed = fcast_speed - ob_speed
                if ob_speed > 0:
                    # wind_dir observation is only valid if wind_speed > 0
                    error_dir = fcast_dir - ob_dir
                    if abs(error_dir) > 180:
                        error_dir = error_dir - math.copysign(360, error_dir)

                    self.analyses['wind_dir']['lead_days'][fcast.lead_days]['stats'] += error_dir
                    self.analyses['wind_dir']['cumulative_stats'] += error_dir
                else:
                    # Adjust for non-observation of low speed winds
                    error_speed = 0.0 if fcast_speed < 1.6 else error_speed - 1.5

                self.analyses['wind_speed']['lead_days'][fcast.lead_days]['stats'] += error_speed
                self.analyses['wind_speed']['cumulative_stats'] += error_speed

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
            for category in sorted(
                cc_categories.values(),
                key=lambda cat: -cat['val']
            ):
                if fcast_okta >= category['okta']['min']:
                    error = category['val'] - layers_max['val']
                    break
        elif fcast_okta > layers_max['okta']['max']:
            for category in sorted(
                cc_categories.values(),
                key=lambda cat: cat['val']
            ):
                if fcast_okta <= category['okta']['max']:
                    error = category['val'] - layers_max['val']
                    break
        else:
            error = 0
        return error

    def _analyze_precip_chance(self, ob, fcast):
        precip_terms = [
            'drizzle',
            'rain',
            'sleet',
            'snow',
            'thunderstorm',
            'unknown'
        ]
        precip_chance = fcast.predicted_weather.precip_chance
        wx_obs = ob.observed_weather.all_weather
        if wx_obs is not None:
            wx_obs = wx_obs.split(', ')
            precip_obs = [
                any(
                    [wx_ob == term for term in precip_terms]
                ) for wx_ob in wx_obs
            ]
            if any(precip_obs):
                self.errors[fcast.lead_days]['precip_chance'].reg_ob(
                    precip_chance)
            else:
                self.errors[fcast.lead_days]['precip_chance'].reg_predicted(
                    precip_chance)