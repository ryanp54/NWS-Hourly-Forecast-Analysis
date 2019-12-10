import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './bootstrap.min.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(
	<App
		apiURL='/OAX/forecasts/analyze?'
		initialData={window.CACHED_DATA}
	/>,
	document.getElementById('root')
);

// Set to unregister() or register().
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
