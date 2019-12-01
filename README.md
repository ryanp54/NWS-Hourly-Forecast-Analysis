## NWS Hourly Forecast Accuracy Analysis

A Google App Engine Python 2 Standard Environment website that displays charts and statistics pertaining to the accuracy of the hourly forecasts it has recorded.

### Setup

Requires [Google App Engine Python SDK](https://cloud.google.com/appengine/downloads) for development and deployment and that the required libraries in requirements.txt have been installed with [`pip`](pip.readthedocs.org).

The /weather directory contains the modules that support the forecast analysis API.

The /app directory contains a React development environment, including the /build subdirectory, which is where the production version of the React app and main static webpage resources reside. If further development is to be done to the React app, the required libraries in package.json must be installed with [`npm`](https://docs.npmjs.com/).

### Customization

This project can be easily adapted to a different NWS weather station by changing the values of the NWS API query info variables in main.py.
