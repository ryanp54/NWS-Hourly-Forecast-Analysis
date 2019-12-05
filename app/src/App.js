import React, { useState, useEffect } from 'react';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import {
  Container, Row, Col, Button,
} from 'react-bootstrap';

import ForecastAnalysis from './forecastAnalysis';
import { getDaysAgo, getISODate } from './helpers';

const DEFAULT_START = getDaysAgo(8);
const DEFAULT_END = getDaysAgo(1);
const DATA_START = new Date(2019, 1, 24);
const DATA_END = getDaysAgo(1);

export default function AnalysisPage({ apiURL, initialData=false }) {
  const [analysis, setAnalysis] = useState(JSON.parse(initialData));
  const [statusMessage, setStatusMessage] = useState('Select date range.');

  const fetchAnalysis = (start, end) => {
    setStatusMessage('Retrieving...');
    setAnalysis(null);

    fetch(`${apiURL}start=${getISODate(start)}&end=${getISODate(end)}`)
      .then((resp) => resp.json())
      .then((json) => { setAnalysis(json); })
      .catch((error) => setStatusMessage(error.message));
  };

  // Request analysis data on mount if not initialized with it.
  useEffect(
    () => { if (!initialData) fetchAnalysis(DEFAULT_START, DEFAULT_END) },
    []
  );

  return (
    <Container>
      <Row className='py-4'>
        <ForecastRangeForm handleSubmit={fetchAnalysis} />
      </Row>
      {analysis
        ? <ForecastAnalysis analysis={analysis} />
        : <Row> {statusMessage} </Row>
      }
    </Container>
  );
}

// Pair of DayPickerInputs used to pick start and end dates that are passed to handlSubmit.
function ForecastRangeForm({ handleSubmit }) {
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);

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
            onClick={() => handleSubmit(start, end)}
          >
            Submit
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

// Wrap DayPickerInput with a label and warning that will be displayed when a
// disabled day is entered. onChange will execute when a valid day is selected. rest props are
// passed to the DayPickerInput.
function ForecastDayPicker({ label, onChange, ...rest }) {
  const [warned, setWarned] = useState(false);

  const disabledDays = {
    before: DATA_START,
    after: DATA_END,
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
