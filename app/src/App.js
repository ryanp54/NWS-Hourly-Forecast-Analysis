import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import { VictoryChart, VictoryAxis, VictoryLine } from 'victory';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import { getLastMonthStart, getLastMonthEnd, getDaysAgo, getISO } from './dateUtilities.js';

const API_URL = '_self' in React.createElement('div') ?
  'http://localhost:8080/OAX/forecasts/analyze?' :
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
  let [start, setStart] = useState(getLastMonthStart());  
  let [end, setEnd] = useState(getLastMonthEnd());

  const fetchReturn = () => (
    onFetch(fetch(`${API_URL}start=${getISO(start)}&end=${getISO(end)}`))
  );

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

function AnalysisPage() {
  let [analysis, setAnalysis] = useState(null);
  let [loading, setLoading] = useState(false);
  let resultsMessage = 'Select date range.';

  if (loading) {
    resultsMessage = 'Retrieving results...';
  }
  
  return (
    <Container>
      <Row>
        <DateRangeForm
          onFetch={(req) => {
            setLoading(true);
            req.then((resp) => resp.json())
            .then((json) => setAnalysis(json))
            .catch((error) => resultsMessage = error);
          }}
        />
      </Row>
      <Row>
        {analysis ? JSON.stringify(analysis) : ''}
      </Row>
    </Container>
  );
}

export default AnalysisPage;
