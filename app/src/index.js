import React from 'react';
import ReactDOM from 'react-dom';
import './bootstrap-custom-tabs.css';
import App from './App';

ReactDOM.render(
	<App
		apiURL='/OAX/forecasts/analyze?'
		initialData={window.CACHED_DATA}
	/>,
	document.getElementById('root')
);
