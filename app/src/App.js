import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import {
  VictoryChart,
  VictoryContainer,
  VictoryAxis,
  VictoryLine,
  VictoryLegend,
  VictoryVoronoiContainer,
} from 'victory';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import { getDaysAgo, getISODate, parseToUTC } from './dateUtilities.js';
import { testData } from './testData.js';

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
    onFetch(fetch(`${API_URL}start=${getISODate(start)}&end=${getISODate(end)}`))
  );

  useEffect(() => onFetch(Promise.resolve(
    new Response(
      testData,
      { "status": 200, headers: { "Content-Type": "application/json" } }
    ))
  ), []);

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
            Submit
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

function Cursor(props) {
  const { x, scale } = props;
  const range = scale.y.range();
  return (
    <line
      style={{
        stroke: "lightgrey",
        strokeWidth: 1
      }}
      x1={x}
      x2={x}
      y1={Math.max(...range)}
      y2={Math.min(...range)}
    />
  );
}

function AnalysisChart({analysis, weather='temperature'}) {
  const obsData = analysis.obs.reduce((data, ob) => {
    if (ob.observed_weather[weather]) {
      data.push({
        x: parseToUTC(ob.time),
        y: ob.observed_weather[weather],
      });
    }
    return data;
  }, []);

  const getFcastData = (leadDays) => {
    return analysis.fcasts[leadDays].map((fcast) => ({
      x: parseToUTC(fcast.valid_time),
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

  const toggleDisplayed = (labelName) => {
    if (
      labelName in fcastLines
      && (
        !getDisplayedLineNames().includes(labelName)
        || (displayedLines.length > 2 && labelName !== 'Observed')
      )
    ) {
      setDisplayedLines([fcastLines[labelName], obsLine]);
    } else if (displayedLines.length < allLines.length) {
      setDisplayedLines(allLines);
    }
  }
  
  return (
    <Container>
      <Row>
        <VictoryChart scale={{ x: "time" }} domainPadding={{ y: 20 }}
          padding={{ top: 75, bottom: 50, left: 50, right: 50 }}
          containerComponent={
            displayedLines.length > 2
              ? <VictoryContainer />
              : <VictoryVoronoiContainer
                voronoiDimension='x'
                labels={() => null}
                labelComponent={<Cursor />}
                onActivated={(points, props) => {
                }}
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
            toggleDisplayed={toggleDisplayed}
            events={[{
                eventHandlers: {
                  onClick: (evt, target, i, legend) => {
                    if (target && target.datum) {
                      legend.props.toggleDisplayed(target.datum.name);
                    }
                  }
                }
            }]}
          />
          
          <VictoryAxis
            tickCount={6}
            tickFormat={(dateTime) => {
              const date = `${dateTime.getMonth() + 1}/${dateTime.getDate()}`;
              let time = dateTime.toLocaleTimeString().split(/[:\s]/);
              return dateTime.getHours() ? `${time[0]} ${time.slice(-1)}` : date;
            }}
            style={{ ticks: { stroke: "black", size: 5 }, grid: { stroke: 'grey' } }}
            offsetY={50}
          />
          <VictoryAxis dependentAxis crossAxis={false}
            style={{ grid: { stroke: 'grey' } }}
          />
            
          {displayedLines}
            
        </VictoryChart>
      </Row>
      <Row>
        <h6>{weather[0].toUpperCase() + weather.slice(1)}</h6><br/>
        <p>
          {displayedLines.map((line) => <span key={line.props.name}>{`${line.props.name}: `}</span>)}
        </p>
      </Row>
    </Container>
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
          analysis
            ? <AnalysisChart analysis={analysis} weather='temperature' />
            : resultsMessage
        }
      </Row>
    </Container>
  );
}

export default AnalysisPage;
