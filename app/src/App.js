import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import { getLastMonthStart, getLastMonthEnd, getDaysAgo, getISO } from './dateUtilities.js';

const API_URL = '_self' in React.createElement('div') ? 'http://localhost:8080' : '';

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

function DateRangeForm({onUpdate}) {
  let [start, setStart] = useState(getLastMonthStart());  
  let [end, setEnd] = useState(getLastMonthEnd());

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
            onClick={(e) => {
              // Format start and end
              fetch(`${API_URL}/OAX/forecasts/analyze?start=${getISO(start)}&end=${getISO(end)}`)
              .then((resp) => resp.text())
              .then(onUpdate)
              .catch((error) => console.log('Error: ', error));
            }}
          >
            Analyze
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

function analysisPage() {
  let [analysis, setAnalysis] = useState();

  return (
    <Container>
      <Row>
        <DateRangeForm onUpdate={setAnalysis} />
      </Row>
      <Row>
        {analysis}
      </Row>
    </Container>
  );
}

export default analysisPage;
