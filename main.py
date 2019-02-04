import logging
import json
import requests
import pdb

from functools import wraps
from datetime import date, datetime, timedelta

from database_setup import RawForecast, Weather, Observation, Forecast, RecordError

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

def get_forecast_start(made_time):
	start_day = datetime(made_time.year, made_time.month, made_time.day)
	if made_time.hour > 12:
		start_day += timedelta(days=1)
	return start_day

def gen_Forecasts(data, made_at):
	start_time = get_forecast_start(made_at)
	end_day = start_time + timedelta(days=7)
	data_start, data_end = get_start_and_end_t(data['validTimes'])
	end_time = end_day if end_day < data_end else data_end
	time_range = (end_time - start_time)
	hours = time_range.days*24 + time_range.seconds/3600
	new_forecasts = {}
	for i in range(hours):
		cur_time = (start_time + timedelta(hours=i)).isoformat()
		lead_days = (24 + i)/24
		new_forecasts[cur_time] = Forecast(
			valid_time=cur_time,
			made=made_at.isoformat(),
			lead_days=lead_days,
			predicted_weather=Weather())

	return new_forecasts

def nws_grid_to_ndb(grid_data, empty_forecasts):
	property_pairs = [
		('temperature', 'temperature'),
		('dewpoint', 'dewpoint'),
		('skyCover', 'cloud_cover'),
		('quantitativePrecipitation', 'precip_6hr'),
		('probabilityOfPrecipitation', 'precip_chance'),
		('windDirection', 'wind_dir'),
		('windSpeed', 'wind_speed')]
	for key, prop in property_pairs:
		crawl_forecast(prop, grid_data[key]['values'], empty_forecasts)

def crawl_forecast(prop, values, ndb_Forecasts):
	for val in values:
		start_t, end_t = get_start_and_end_t(val['validTime'])
		while start_t < end_t:
			if start_t.isoformat() in ndb_Forecasts:
				weather = ndb_Forecasts[start_t.isoformat()].predicted_weather
				setattr(weather, prop, val['value'])
			start_t += timedelta(hours=1)

@app.route('/test')
def test():
	if request.headers.get('Host') != 'localhost:8080':
		return 'Forbidden', 403
	else:
		pdb.set_trace()
	return 'Success'

@app.route('/OAX/forecasts/record')
@cron_only
def record_forecast():
	r = requests.get('https://api.weather.gov/gridpoints/' + grid_point, headers=headers)
	grid_data = r.json()['properties']
	made_at = iso2datetime(grid_data['updateTime'])
	if made_at < days_ago(1):
		stale = RecordError(error_message='Forecast record fail: forecast was not current.')
		stale.put()
		r.status_code = 500
	elif r.status_code >= 200 and r.status_code < 300:
		ndb_Forecasts = gen_Forecasts(grid_data, made_at)
		nws_grid_to_ndb(grid_data, ndb_Forecasts)
		ndb.put_multi(ndb_Forecasts.values())

	return jsonify(r.json()), r.status_code

@app.route('/OAX/observations/record')
@cron_only
def record_observation():
	new_obs = []
	last_ob = iso2datetime(last_observation().key.id())
	r = requests.get(
		'https://api.weather.gov/stations/' + station_code + '/observations?end='
		+ days_ago(1).isoformat().split('.')[0] + 'Z&start='
		+ last_ob.isoformat().split('.')[0] + 'Z',
		headers=headers)

	if r.status_code >= 200 and r.status_code < 300:
		observations_data = r.json()['features']
		new_obs = [key.id() for key in put_hourly_obs(observations_data, last_ob)]

	return jsonify(newObservations=new_obs), r.status_code

@app.route('/OAX/rawForecasts/record')
def record_rawforecast():
	r = requests.get('https://api.weather.gov/gridpoints/' + grid_point, headers=headers)
	new_forecast = RawForecast(date=date.today().isoformat(), forecast=r.json())
	if r.status_code >= 200 and r.status_code < 300:
		new_forecast.put()

	return jsonify(r.json()), r.status_code

@app.route('/OAX/rawForecasts/history')
def get_rawforecasts_history():
	forecasts = []
	for forecast in RawForecast.query().order(RawForecast.date):
		forecasts.append({'date': forecast.date, 'forecast': forecast.forecast})

	return jsonify(forecasts=forecasts)

def put_hourly_obs(obs, last_ob = datetime(1,1,1)):
	obs2put = []
	for ob in obs:
		hour = filter2hourly(ob)
		if hour and hour > last_ob:
			ob['properties']['time'] = hour
			obs2put.append(to_Observation(ob['properties']))

	return ndb.put_multi(obs2put)

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

def last_observation():	
	return Observation.query().order(-Observation.time).fetch(1, projection=[Observation.time])[0]

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

def iso2datetime(iso_str):
	# Remove any unwanted addition information
	iso_str = iso_str.split('+')[0].split('.')[0]

	return datetime.strptime(iso_str, '%Y-%m-%dT%H:%M:%S')

def days_ago(days): return datetime.utcnow() - timedelta(days=days)

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


def null2zero(val):
	return val if val else 0