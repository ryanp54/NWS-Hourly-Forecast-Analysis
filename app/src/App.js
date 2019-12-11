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
const DATA_START = new Date(2019, 0, 24);
const DATA_END = getDaysAgo(1);
const MAX_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function AnalysisPage({ apiURL, initialData = false }) {
  const [analysis, setAnalysis] = useState(JSON.parse(initialData));
  const [statusMessage, setStatusMessage] = useState('Select date range.');

  const fetchAnalysis = (start, end) => {
    setStatusMessage('Retrieving. . .');
    setAnalysis(null);

    const animateStatus = setInterval(() => {
      setStatusMessage((previous) => previous.includes('. . .') ? 'Retrieving' : `${previous} .`);
    }, 500);

    fetch(`${apiURL}start=${getISODate(start)}&end=${getISODate(end)}`)
      .then((resp) => resp.json())
      .then((json) => {
        setStatusMessage('');
        setAnalysis(json);
      })
      .catch((error) => setStatusMessage(error.message))
      .finally(() => clearInterval(animateStatus));
  };

  // Request analysis data on mount if not initialized with it.
  useEffect(
    () => { if (!initialData) fetchAnalysis(DEFAULT_START, DEFAULT_END) },
    []
  );

  return (
    <div>
      <div className='pt-2 pb-4'>
        <ForecastRangeForm handleSubmit={fetchAnalysis} />
      </div>
      <div>
        {analysis
          ? <ForecastAnalysis analysis={analysis} />
          : <StatusMessage message={statusMessage} />
        }
      </div>
    </div>
  );
}

// Pair of DayPickerInputs used to pick start and end dates that are passed to handlSubmit.
function ForecastRangeForm({ handleSubmit }) {
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);

  const range = (new Date(end)) - (new Date(start));

  let warning = '';
  if (start === null || end === null) {
    warning = 'Data not available for all selected dates.';
  } else if (!start) {
    warning = 'Select valid start date.';
  } else if (!end) {
    warning = 'Select valid end date.';
  } else if (end <= start) {
    warning = 'Start date must be before end date.';
  } else if (range >= MAX_DAYS * MS_PER_DAY) {
    warning = `Date range must be less than ${MAX_DAYS} days.`;
  }

  return (
    <Container>
      <Row className='justify-content-center'>
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
            disabled={warning}
            onClick={() => { if (!warning) handleSubmit(start, end) }}
          >
            {'Submit'}
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <span className={'text-center text-danger position-absolute w-100'}>
            {warning}
          </span>
        </Col>
      </Row>
    </Container>
  );
}

// Wrap DayPickerInput with a label. onChange will execute when a valid day is
// selected. rest props are passed to the DayPickerInput.
function ForecastDayPicker({ label, onChange, ...rest }) {
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
        </Col>
      </Row>
      <Row>
        <Col>
          <DayPickerInput
            {...rest}
            onDayChange={(day, mod) => { onChange(mod.disabled ? null : day) }}
            dayPickerProps={{ disabledDays }}
          />
        </Col>
      </Row>
    </Col>
  );
}

function StatusMessage({ message }) {
  return (
    <Container>
      <Row className='d-flex justify-content-center'>
        <Col xs={4} md={3} lg={2}>
          {message}
        </Col>
      </Row>
    </Container>
  );
}
