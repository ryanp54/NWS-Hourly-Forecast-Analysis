# -*- coding: utf-8 -*-
__all__ = ['FcastAnalysis']

import math
import ast

from weather.ndb_setup import Observation, Forecast
from weather.stats import SimpleError, BinCount


class FcastAnalysis(object):
    """Create a forecast accuracy analysis.

    Attributes:
        analyses (dict): The analysis results.
    """

    # Details of supported weather types.
    wx_types = {
        'temperature': {
            'prop_name': 'temperature',
            'display_name': 'Temperature',
            'units': '°C',
            'error_threshold': 1.67
        },
        'dewpoint': {
            'prop_name': 'dewpoint',
            'display_name': 'Dewpoint',
            'units': '°C',
            'error_threshold': 1.67
        },
        'precip_6hr': {
            'prop_name': 'precip_6hr',
            'display_name': '6-Hour Precipitation Amount',
            'units': 'mm',
            'error_threshold': 2.54
        },
        'cloud_cover': {
            'prop_name': 'cloud_cover',
            'display_name': 'Cloud Cover',
            'units': '%',
            'error_threshold': 24
        },
        'wind_dir': {
            'prop_name': 'wind_dir',
            'display_name': 'Wind Direction',
            'units': 'degrees ',
            'error_threshold': 45
        },
        'wind_speed': {
            'prop_name': 'wind_speed',
            'display_name': 'Wind Speed',
            'units': 'm/s',
            'error_threshold': 1.34
        },
        'precip_chance': {
            'prop_name': 'precip_chance',
            'display_name': 'Precipitation Chance',
            'units': '%'
        },
    }

    def __init__(self, start_t, end_t='9999-12-31', valid_lead_ds=range(1, 8)):
        """Retrieve and analyze forecasts.

        Retrieve the relevant observation and forecast data. Calculate various
        statistics to analyze the accuracy of the forecast for various waether
        types and record along with the forecast and observation data. For
        probablistic forecasts only record the bin count information.

        Args:
            start_t (str): Start date of range for analysis (YYYY-MM-DD).
            end_t (str, optional): End date of range for analysis (YYYY-MM-DD).
            valid_lead_ds (list of int, optional): Valid forecast lead days.

        """
        obs = Observation.query(
            Observation.time >= start_t,
            Observation.time <= end_t
        ).fetch()

        self._init_analyses(valid_lead_ds)
        self._analyze(obs)

    def _init_analyses(self, valid_lead_ds):

        def make_stat(error_threshold):
            if error_threshold is not None:
                return SimpleError(error_threshold=error_threshold)
            else:
                return BinCount()

        analyses = {}
        for wx_type, data in self.wx_types.items():
            analyses[wx_type] = {
                'obs': {},
                'metadata': data,
                'lead_days': {},
                'cumulative_stats': make_stat(data.get('error_threshold')),
            }

            for lead_day in valid_lead_ds:
                analyses[wx_type]['lead_days'][lead_day] = {
                    'stats': make_stat(data.get('error_threshold')),
                    'fcasts': {},
                    'errors': {},
                }

        self.analyses = analyses

    def forjson(self):
        """Return a dict that is json serializable."""
        return ast.literal_eval(str(self.analyses))

    def _analyze(self, obs):
        for ob in obs:
            valid_fcasts = Forecast.query(
                Forecast.valid_time == ob.time
            ).fetch()

            self._get_basic_errors(ob, valid_fcasts)
            self._get_wind_errors(ob, valid_fcasts)
            self._analyze_precip_chance(ob, valid_fcasts)
            self._get_cloud_cover_errors(ob, valid_fcasts)

    def _get_basic_errors(self, ob, fcasts):
        wx_error_fns = {
            'temperature': lambda ob, fcast: fcast - ob,
            'dewpoint': lambda ob, fcast: fcast - ob,
            'precip_6hr': lambda ob, fcast: (
                fcast - ob if fcast + ob > 0 else None
            ),
        }
        MM_PER_M = 1000

        for wx_type, wx_fn in wx_error_fns.items():
            ob_val = getattr(ob.observed_weather, wx_type)

            # Special conversion and non-recording of negative values
            # necessary for precip amounts.
            if wx_type == 'precip_6hr':
                ob_val = ob_val*MM_PER_M
                if ob_val >= 0:
                    self.analyses[wx_type]['obs'][ob.time] = ob_val
            else:
                self.analyses[wx_type]['obs'][ob.time] = ob_val

            error_threshold = self.wx_types[wx_type]['error_threshold']
            leaddays_obj = self.analyses[wx_type]['lead_days']
            for fcast in fcasts:
                fcast_val = getattr(fcast.predicted_weather, wx_type)

                if fcast_val is not None:
                    leaddays_obj[fcast.lead_days]['fcasts'][
                        fcast.valid_time] = fcast_val

                if fcast_val is not None and ob_val is not None:
                    error_val = wx_fn(ob_val, fcast_val)

                    leaddays_obj[fcast.lead_days]['stats'] += error_val
                    self.analyses[wx_type]['cumulative_stats'] += error_val

                    if (
                        error_val is not None
                        and abs(error_val) > error_threshold
                    ):
                        leaddays_obj[fcast.lead_days]['errors'][
                            fcast.valid_time] = error_val

    def _get_wind_errors(self, ob, fcasts):
        ob_speed = ob.observed_weather.wind_speed
        ob_dir = ob.observed_weather.wind_dir
        if ob_speed is not None:
            self.analyses['wind_speed']['obs'][ob.time] = ob_speed

            # ob_dir is only valid if ob_speed > 0
            if ob_speed > 0:
                self.analyses['wind_dir']['obs'][ob.time] = ob_dir

            dir_threshold = self.wx_types['wind_dir']['error_threshold']
            speed_threshold = self.wx_types['wind_speed']['error_threshold']
            for fcast in fcasts:
                fcast_speed = fcast.predicted_weather.wind_speed
                fcast_dir = fcast.predicted_weather.wind_dir
                error_speed = fcast_speed - ob_speed

                if ob_speed > 0:
                    error_dir = fcast_dir - ob_dir
                    # Correct error when it should be measured across the
                    # 360/0 degree boundry instead.
                    if abs(error_dir) > 180:
                        error_dir = error_dir - math.copysign(360, error_dir)

                    leadday_dir = self.analyses['wind_dir']['lead_days'][
                        fcast.lead_days]

                    leadday_dir['fcasts'][fcast.valid_time] = fcast_dir
                    leadday_dir['stats'] += error_dir
                    self.analyses['wind_dir']['cumulative_stats'] += error_dir

                    if (
                        error_dir is not None
                        and abs(error_dir) > dir_threshold
                    ):
                        leadday_dir['errors'][fcast.valid_time] = error_dir

                else:
                    # Adjust for non-observation of low speed winds
                    if fcast_speed < 1.5:
                        error_speed = 0.0
                    else:
                        error_speed = error_speed - 1.4

                leadday_speed = self.analyses['wind_speed']['lead_days'][
                    fcast.lead_days]

                leadday_speed['fcasts'][fcast.valid_time] = fcast_speed
                leadday_speed['stats'] += error_speed
                self.analyses['wind_speed']['cumulative_stats'] += error_speed

                if (
                    error_speed is not None
                    and abs(error_speed) > speed_threshold
                ):
                    leadday_speed['errors'][fcast.valid_time] = error_speed

    def _get_cloud_cover_errors(self, ob, fcasts):
        cc_categories = {
            'VV': {'val': 0, 'ok_oktas': {'min': 0.75, 'max': 8}},
            'CLR': {'val': 25, 'ok_oktas': {'min': 0, 'max': 2.5}},
            'SCT': {'val': 50, 'ok_oktas': {'min': 0.75, 'max': 5}},
            'BKN': {'val': 75, 'ok_oktas': {'min': 3.5, 'max': 7.5}},
            'OVC': {'val': 100, 'ok_oktas': {'min': 6.5, 'max': 8}},
        }
        OKTA2PERCENT = 100/8

        ob_val = ob.observed_weather.cloud_cover

        if ob_val is None:
            return

        ob_layers = [cc_categories[layer] for layer in ob_val.split(', ')]
        ob_details = max(ob_layers, key=lambda cc: cc['val'])

        error_threshold = self.wx_types['cloud_cover']['error_threshold']
        self.analyses['cloud_cover']['obs'][ob.time] = ob_details['val']
        for fcast in fcasts:
            fcast_percent = fcast.predicted_weather.cloud_cover
            error = 0

            # Check and handle special 'VV' case. This case means there is
            # cloud cover but of an unkown coverage amount.
            # Otherwise assign the forecasted category in a way that minimizes
            # the error amount to avoid over punishing edge cases.
            if ob_details['val'] == 0:
                error = 0 if fcast_percent >= 0.75*OKTA2PERCENT else 25
            elif fcast_percent < ob_details['ok_oktas']['min']*OKTA2PERCENT:
                for category in sorted(
                    cc_categories.values(),
                    key=lambda cat: -cat['val']
                ):
                    if (fcast_percent
                            >= category['ok_oktas']['min']*OKTA2PERCENT):
                        error = category['val'] - ob_details['val']
                        break

            elif fcast_percent > ob_details['ok_oktas']['max']*OKTA2PERCENT:
                for category in sorted(
                    cc_categories.values(),
                    # Sort VV case to last to make sure it is never reached.
                    key=lambda cat: cat['val'] if cat['val'] != 0 else 101
                ):
                    if (fcast_percent
                            <= category['ok_oktas']['max']*OKTA2PERCENT):
                        error = category['val'] - ob_details['val']
                        break

            # Record the results in forecast analyses
            self.analyses['cloud_cover']['lead_days'][fcast.lead_days][
                'fcasts'][fcast.valid_time] = ob_details['val'] + error
            self.analyses['cloud_cover']['lead_days'][fcast.lead_days][
                'stats'] += error
            self.analyses['cloud_cover']['cumulative_stats'] += error

            if (error is not None and abs(error) > error_threshold):
                self.analyses['cloud_cover']['lead_days'][fcast.lead_days][
                    'errors'][fcast.valid_time] = error

    def _analyze_precip_chance(self, ob, fcasts):
        precip_terms = [
            'drizzle',
            'rain',
            'sleet',
            'snow',
            'thunderstorm',
            'unknown'
        ]

        # Collect any observations of precip
        precip_obs = []
        wx_obs = ob.observed_weather.all_weather
        if wx_obs is not None:
            wx_obs = wx_obs.split(', ')
            precip_obs = [
                any(
                    [wx_ob == term for term in precip_terms]
                ) for wx_ob in wx_obs
            ]
        if ob.observed_weather.precip_1hr > 0:
            precip_obs.append(True)

        # Record the results in forecast analyses
        for fcast in fcasts:
            precip_chance = fcast.predicted_weather.precip_chance
            if any(precip_obs):
                self.analyses['precip_chance']['lead_days'][
                    fcast.lead_days]['stats'].reg_ob(precip_chance)
                self.analyses['precip_chance'][
                    'cumulative_stats'].reg_ob(precip_chance)
            else:
                self.analyses['precip_chance']['lead_days'][
                    fcast.lead_days]['stats'].reg_predicted(precip_chance)
                self.analyses['precip_chance'][
                    'cumulative_stats'].reg_predicted(precip_chance)
