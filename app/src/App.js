import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import {
  VictoryChart,
  VictoryAxis,
  VictoryLine,
  VictoryLegend,
  VictoryVoronoiContainer
} from 'victory';

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
  const obsData = analysis.obs.reduce((data, ob) => {
    if (ob.observed_weather[weather]) {
      data.push({
        x: ob.time,
        y: ob.observed_weather[weather],
      });
    }
    return data;
  }, []);

  const getFcastData = (leadDays) => {
    return analysis.fcasts[leadDays].map((fcast) => ({
      x: fcast.valid_time,
      y: fcast.predicted_weather[weather]
    }));
  };

  const getLegendData = (lines) => lines.map((line) => {
    const style = line.props.style || line.props.theme.line.style;
    return {
      name: line.props.name,
      symbol: {
        opacity: getDisplayedLineNames().includes(line.props.name) ? style.data.opacity : 0.05,
        fill: style.data.stroke
      },
      labels: {
        opacity: getDisplayedLineNames().includes(line.props.name) ? 1 : 0.15
      }
    }
  });

  const obsLine = <VictoryLine name={'Observed'} data={obsData} key='obs' />;
  const fcastLines = {};
  for (const leadDays in analysis.fcasts) {
    const name = `${leadDays}-Day`;
    fcastLines[name] = (
      <VictoryLine
        name={name}
        data={getFcastData(leadDays)}
        style={{
          data: {
            opacity: leadDays > 1 ? (9 - leadDays)/10 : 1.0,
            stroke: 'red'
          }
        }}
        key={leadDays}
      />  
    );
  }
  const allLines = [...Object.values(fcastLines), obsLine];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  let [displayedLines, setDisplayedLines] = useState(allLines);
  const getDisplayedLineNames = () => displayedLines.map((line) => line.props.name);

  const handleLegendClick = (labelName) => {
    if (
      !getDisplayedLineNames().includes(labelName)
      || (displayedLines.length > 2 && labelName !== 'Observed')
    ) {
      setDisplayedLines([fcastLines[labelName], obsLine]);
    } else if (displayedLines.length < allLines.length) {
      setDisplayedLines(allLines);
    }
  }
  
  return (
    <VictoryChart scale={{ x: "time" }} domainPadding={{ y: 20 }}
      padding={{ top: 75, bottom: 50, left: 50, right: 50 }}
      containerComponent={
        <VictoryVoronoiContainer
          disable={displayedLines.length > 2 ? true : false}
          labels={(datum) => `${Math.round(datum.y, 2)} at ${(new Date(datum.x)).getHours()}:00`}
        />
      }
    >
      <VictoryLegend x={50} y={35}
        orientation="horizontal"
        borderPadding={{ top: 5, bottom: 0, left: 5, right: 5 }}
        gutter={10}
        symbolSpacer={5}
        style={{ border: { stroke: "black" }, labels: { fontSize: 9 } }}
        data={ getLegendData(allLines) }
        toggleDisplayed={handleLegendClick}
        events={[{
            target: ["data", "labels"],
            eventHandlers: {
              onClick: (e, f, g, h, i, j) => {
                h.props.toggleDisplayed(f.datum.name);
              }
            }
        }]}
      />
      
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

      {displayedLines}

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
            setResultsMessage('Retrieving...');
            setAnalysis(null);
            request.then((resp) => resp.json())
              .then((json) => { setAnalysis(json); })
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
