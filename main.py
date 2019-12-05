# -*- coding: utf-8 -*-
"""Main code for handling web requests."""
from functools import wraps
from datetime import date
from json import dumps

from weather.ndb_setup import (
    RawForecast, RawObservation, Forecast, RecordError)
from weather.nws_parse import GridData, ObservationData
from weather.fcastanalysis import FcastAnalysis
from weather.helpers import days_ago, short_isotime, gen_analysis_key

from requests import get
from flask import Flask, request, jsonify, render_template, Markup, Response
from google.appengine.api import memcache
from requests_toolbelt.adapters import appengine

appengine.monkeypatch()

app = Flask(__name__, template_folder='app')
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True
app.config['JSON_AS_ASCII'] = False


# Use json.dumps with options analagous to the JSONIFY_PRETTYPRINT_REGULAR
# config set above.
def dumps_prettyprint(item):
    return dumps(item, sort_keys=True,
                 indent=4, separators=(',', ': '))


# Info for NWS API queries.
nws_wfo = 'OAX'  # Also used for the routes.
nws_gridpoint = '{}/76,56'.format(nws_wfo)
nws_station = 'KMLE'
nws_headers = {
    'user-agent':
        'site:weather2019.appspot.com; contact-email:ryanp54@yahoo.com'
}


# # # Route wrappers # # #


def cron_only(f):
    @wraps(f)
    def restricted2cron(*args, **kwargs):
        if (
            request.headers.get('Host') != 'localhost:8080'
            and not request.headers.get('X-Appengine-Cron')
        ):
            return 'Forbidden', 403
        return f(*args, **kwargs)
    return restricted2cron


def allow_cors(f):
    @wraps(f)
    def cors_fix(*args, **kwargs):
        resp = f(*args, **kwargs)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp
    return cors_fix


# # # Routes # # #


@app.route('/')
@app.route('/index')
def welcome():
    cached_analysis = memcache.get(gen_analysis_key(days_ago(8), days_ago(1)))

    if cached_analysis:
        analysis = Markup('`{}`'.format(cached_analysis))
    else:
        analysis = None

    return render_template('/build/index.html', initialdata=analysis)


@app.route('/{}/forecasts/analyze'.format(nws_wfo))
@allow_cors
def analyze_fcasts():
    start = request.args['start']
    end = request.args['end']

    cache_key = gen_analysis_key(start, end)
    cached_analysis = memcache.get(cache_key)

    if cached_analysis is None:
        analysis = dumps_prettyprint(FcastAnalysis(start, end).forjson())
        memcache.add(cache_key, analysis, 60*60*24)
    else:
        analysis = cached_analysis

    return Response(response=analysis, mimetype='application/json')


@app.route('/{}/forecasts/'.format(nws_wfo))
@allow_cors
def get_forecasts():
    query = Forecast.query()
    for param, val in request.args.items():
        try:
            prop = getattr(Forecast, param)
        except AttributeError:
            pass
        else:
            if prop is Forecast.lead_days:
                val = int(val)
            query = query.filter(prop == val)

    resp = map(lambda result: result.to_dict(), query.fetch(168))
    return jsonify(
        sorted(resp, key=lambda x: [x['valid_time'], x['lead_days']]))


@app.route('/{}/forecasts/record'.format(nws_wfo))
@cron_only
def record_forecast():
    resp = get(
        'https://api.weather.gov/gridpoints/' + nws_gridpoint,
        headers=nws_headers)
    grid_data = GridData(resp.json()['properties'])
    if grid_data.made_t < days_ago(1):
        stale = RecordError(
            error_message='Forecast record fail: forecast was not current.')
        stale.put()
        resp.status_code = 500
    elif resp.status_code >= 200 and resp.status_code < 300:
        resp = jsonify(map(lambda key: key.id(), grid_data.to_ndb()))

    return resp


@app.route('/{}/observations/record'.format(nws_wfo))
@cron_only
def record_observation():
    resp = get(
        'https://api.weather.gov/stations/' + nws_station
        + '/observations?end=' + short_isotime(days_ago(1))
        + 'Z&start=' + short_isotime(days_ago(4)) + 'Z',
        headers=nws_headers
    )
    if resp.status_code >= 200 and resp.status_code < 300:
        obs_data = ObservationData(resp.json()['features'])
        obs_data.put_raw()
        put_keys = obs_data.to_ndb()

        resp = jsonify(map(lambda key: key.id(), put_keys))

    if len(obs_data.ndb_obs) == 0:
        RecordError(
            error_message='Observation record fail: no new observations found.'
        ).put()

        resp.status_code = 500

    return resp


@app.route('/{}/rawForecasts/record'.format(nws_wfo))
@cron_only
def record_rawforecast():
    r = get(
        'https://api.weather.gov/gridpoints/' + nws_gridpoint,
        headers=nws_headers)
    new_forecast = RawForecast(
        date=date.today().isoformat(),
        forecast=r.json())
    if r.status_code >= 200 and r.status_code < 300:
        new_forecast.put()

    return jsonify(r.json()), r.status_code


@app.route('/{}/rawForecasts/'.format(nws_wfo))
@app.route('/{}/rawForecasts/<date_made>'.format(nws_wfo))
def get_rawforecasts(date_made=None):
    if date_made:
        forecast = RawForecast.query(RawForecast.date == date_made).get()
    else:
        forecast = RawForecast.query().order(-RawForecast.date).get()

    return jsonify(
        forecast={'date': forecast.date, 'forecast': forecast.forecast})


@app.route('/{}/rawObservations/'.format(nws_wfo))
@app.route('/{}/rawObservations/<date_made>'.format(nws_wfo))
def get_rawobservations(date_made=None):
    if date_made:
        observation = RawObservation.query(
            RawObservation.date == date_made
        ).get()
    else:
        observation = RawObservation.query().order(-RawObservation.date).get()

    return jsonify(
        observation={
            'date': observation.date,
            'observation': observation.observation
        })
