import React, { useState } from 'react';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import {
  Container, Row, Col, Button,
} from 'react-bootstrap';

import ForecastAnalysis from './forecastAnalysis';
import { getDaysAgo, getISODate } from './helpers';
import { testData } from './testData';

const API_URL = '/OAX/forecasts/analyze?';


export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState(JSON.parse(testData));
  const [statusMessage, setStatusMessage] = useState('Select date range.');

  const onFetchStart = (request) => {
    setStatusMessage('Retrieving...');
    setAnalysis(null);

    request
      .then((resp) => resp.json())
      .then((json) => { setAnalysis(json); })
      .catch((error) => setStatusMessage(error.message));
  };

  return (
    <Container>
      <Row className='py-4'>
        <ForecastRangeForm
          onFetchStart={onFetchStart}
        />
      </Row>
      {analysis
        ? <ForecastAnalysis analysis={analysis} />
        : <Row> {statusMessage} </Row>
      }
    </Container>
  );
}

// Wrap DayPickerInput with a label and warning that will be displayed when a
// disabled day is entered. onChange will execute when a valid day is selected. rest props are
// passed to the DayPickerInput.
function ForecastDayPicker({ label, onChange, ...rest }) {
  const [warned, setWarned] = useState(false);

  const disabledDays = {
    before: new Date(2019, 1, 1),
    after: getDaysAgo(2),
  };

  return (
    <Col className='pb-3'>
      <Row>
        <Col>
          <label>
            {`${label}:`}
          </label>
          <span className={'advisory float-right text-danger'}>
            {` ${warned ? 'Check date.' : ''}`}
          </span>
        </Col>
      </Row>
      <Row>
        <Col>
          <DayPickerInput
            {...rest}
            onDayChange={(day, mod) => {
              if (!day || (mod.disabled && !warned)) {
                setWarned(true);
              } else if (day && !mod.disabled) {
                if (warned) {
                  setWarned(false);
                }
                onChange(day);
              }
            }}
            dayPickerProps={{ disabledDays }}
          />
        </Col>
      </Row>
    </Col>
  );
}

// Pair of DayPickerInputs used to submit a request to the forecast anaylsis API endpoint.
// This request will be passed to the function passed in to the onFetchStart parameter.
function ForecastRangeForm({ onFetchStart }) {
  const [start, setStart] = useState(getDaysAgo(10));
  const [end, setEnd] = useState(getDaysAgo(3));

  const requestURL = `${API_URL}start=${getISODate(start)}&end=${getISODate(end)}`;

  return (
    <Container className='pb-3'>
      <Row className='d-flex justify-content-center'>
        <Col xs={'auto'}>
          <ForecastDayPicker
            label={'Start'}
            value={start}
            onChange={setStart}
          />
        </Col>
        <Col xs={'auto'}>
          <ForecastDayPicker
            label={'End'}
            value={end}
            onChange={setEnd}
          />
        </Col>
        <Col md={2} className='d-flex align-self-center justify-content-center mt-3'>
          <Button
            onClick={() => onFetchStart(fetch(requestURL))}
          >
            Submit
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
