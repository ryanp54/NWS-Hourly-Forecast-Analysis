import logging
import json
import requests
import pdb

from functools import wraps
from datetime import date, datetime, timedelta

from forecastcheck.ndb_setup import RawForecast, Weather, Observation, Forecast, RecordError
from forecastcheck.nws_parse import	GridData, ObservationData

from google.appengine.ext import ndb
from flask import (Flask, request, send_from_directory, redirect,url_for, jsonify,
	make_response, current_app)
from requests_toolbelt.adapters import appengine
appengine.monkeypatch()

app = Flask(__name__)
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

grid_point = 'OAX/76,56'
station_code = 'KMLE'
headers = {'user-agent': 'site:weather2019.appspot.com; contact-email:ryanp54@yahoo.com'}

def cron_only(f):
	@wraps(f)
	def restricted2cron(*args, **kwargs):
		if not request.headers.get('X-Appengine-Cron'):
			return 'Forbidden', 403
		return f(*args, **kwargs)
	return restricted2cron

@app.route('/')
@app.route('/index')
def welcome():
	return send_from_directory('static', 'index.html')

@app.route('/test')
def test():
	if request.headers.get('Host') != 'localhost:8080':
		return 'Forbidden', 403
	else:
		pdb.set_trace()
	return 'Success'

@app.route('/OAX/forecasts/record')
#@cron_only
def record_forecast():
	resp = requests.get('https://api.weather.gov/gridpoints/' + grid_point, headers=headers)
	grid_data = GridData(resp.json()['properties'])
	if grid_data.made_t < days_ago(1):
		stale = RecordError(error_message='Forecast record fail: forecast was not current.')
		stale.put()
		resp.status_code = 500
	elif resp.status_code >= 200 and resp.status_code < 300:
		resp = jsonify(grid_data.to_ndb())
	return resp

@app.route('/OAX/observations/record')
#@cron_only
def record_observation():
	last_ob_t = ObservationData.last_ndb_time()
	resp = requests.get(
		'https://api.weather.gov/stations/' + station_code + '/observations?end='
		+ days_ago(1).isoformat().split('.')[0] + 'Z&start='
		+ last_ob_t.isoformat().split('.')[0] + 'Z',
		headers=headers)
	if resp.status_code >= 200 and resp.status_code < 300:
		obs_data = ObservationData(resp.json()['features'])
		resp = jsonify(obs_data.to_ndb())
	if len(obs_data.ndb_obs) == 0:
		no_obs = RecordError(error_message='Observation record fail: no new observations found.')
		no_obs.put()
		resp.status_code = 500
	return resp

@app.route('/OAX/rawForecasts/record')
#@cron_only
def record_rawforecast():
	r = requests.get('https://api.weather.gov/gridpoints/' + grid_point, headers=headers)
	new_forecast = RawForecast(date=date.today().isoformat(), forecast=r.json())
	if r.status_code >= 200 and r.status_code < 300:
		new_forecast.put()

	return jsonify(r.json()), r.status_code

@app.route('/OAX/rawForecasts/')
def get_rawforecasts():
	forecasts = []
	for forecast in RawForecast.query().order(RawForecast.date):
		forecasts.append({'date': forecast.date, 'forecast': forecast.forecast})

	return jsonify(forecasts=forecasts)

def days_ago(days): return datetime.utcnow() - timedelta(days=days)