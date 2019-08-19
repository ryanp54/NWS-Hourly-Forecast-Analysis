import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import { VictoryChart, VictoryAxis, VictoryLine } from 'victory';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import { getDaysAgo, getISO } from './dateUtilities.js';

const API_URL = '_self' in React.createElement('div') ?
  'https://weather2019.appspot.com/OAX/forecasts/analyze?' :
  '/OAX/forecasts/analyze?';

function ForecastDayPicker(props) {
  let [warned, setWarned] = useState(false);

  return (
    <Col md={'auto'}>
      <Row>
        <Col>
          <label>
            {props.label + ':'}
          </label>
          <span className={'advisory float-right text-danger'}>
            {` ${warned ? 'Check date.' : ''}`}
          </span>
        </Col>
      </Row>
      <Row>
        <Col>
          <DayPickerInput
            {...props}
            onDayChange={(day, mod) => {
              if (!day || (mod.disabled && !warned)) {
                setWarned(true);
              } else if (day && !mod.disabled) {
                if (warned) {
                  setWarned(false);
                }
                props.onChange(day);
              }
            }}
            dayPickerProps={{
              disabledDays: {
                before: new Date(2019, 1, 1),
                after: getDaysAgo(2),
              }
            }}
          />
        </Col>
      </Row>
    </Col>
  );
}

function DateRangeForm({onFetch}) {
  let [start, setStart] = useState(getDaysAgo(10));  
  let [end, setEnd] = useState(getDaysAgo(3));

  const fetchReturn = () => (
    onFetch(fetch(`${API_URL}start=${getISO(start)}&end=${getISO(end)}`))
  );

  useEffect(fetchReturn, []);

  return (
    <Container>
      <Row className='align-items-end justify-content-center'>
        <ForecastDayPicker
          label={'Start'}
          value={start}
          onChange={setStart}
        />
        <ForecastDayPicker
          label={'End'}
          value={end}
          onChange={setEnd}
        />
        <Col md={2}>
          <Button
            onClick={fetchReturn}
          >
            Analyze
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

function AnalysisChart({analysis, weather='temperature'}) {
  const obsData = analysis.obs.map((ob) => ({
    x: ob.time,
    y: ob.observed_weather[weather],
  }));
  const getFcastData = (leadDays) => {
    return analysis.fcasts[leadDays].map((fcast) => ({
      x: fcast.valid_time,
      y: fcast.predicted_weather[weather]
    }));
  };

  const fcastLines = [];
  for (const leadDays in analysis.fcasts) {
    fcastLines.push(
      <VictoryLine
        data={getFcastData(leadDays)}
        style={{
          data: {
            opacity: leadDays > 1 ? (8 - leadDays)/10 : 1.0,
            stroke: 'red'
          }
        }}
        key={leadDays}
      />  
    );
  }
  
  return (
    <VictoryChart scale={{x: "time"}} domainPadding={{y: 20}} >
      
      <VictoryAxis
        tickCount={4}
        tickFormat={(t) => {
          const date = new Date(t);
          return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
        }}
        style={{ticks: {stroke: "black", size: 5}}}
        offsetY={50}
      />
      <VictoryAxis dependentAxis crossAxis={false}/>

      {fcastLines}
      <VictoryLine data={obsData} />

    </VictoryChart>    
  );
}

function AnalysisPage() {
  let [analysis, setAnalysis] = useState(null);
  let [resultsMessage, setResultsMessage] = useState('Select date range.');
  
  return (
    <Container>
      <Row>
        <DateRangeForm
          onFetch={(request) => {
            setResultsMessage('Retrieving results...');
            setAnalysis(null);
            request.then((resp) => resp.json())
            .then((json) => setAnalysis(json))
            .catch((error) => setResultsMessage(error.message));
          }}
        />
      </Row>
      <Row>
        {
          analysis ?
            <AnalysisChart analysis={analysis} weather='temperature' /> :
            resultsMessage
        }
      </Row>
    </Container>
  );
}

export default AnalysisPage;
