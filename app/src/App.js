import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import {
  VictoryChart,
  VictoryContainer,
  VictoryAxis,
  VictoryArea,
  VictoryGroup,
  VictoryLabel,
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

function AnalysisChart({
  analysis,
  weather = { propName: 'temperature', displayName: 'Temperature', errorThreshold: 1.67 }
}) {
  const [activeData, setActiveData] = useState([]);
 
  const allLeadDays = Object.keys(analysis.fcastData).map((key) => `${key}-Day`);
  // Is this an anti-pattern?
  const [activeLeadDays, setActiveLeadDays] = useState(allLeadDays);

  const forecastLines = Object.keys(analysis.fcastData).map((leadDay) => (
      <VictoryLine
        displayName={`${leadDay}-Day`}
        data={analysis.fcastData[leadDay]}
        style={{
          data: {
            opacity: leadDay > 1 ? (9 - leadDay)/10 : 1.0,
            stroke: 'rgb(256, 0, 0)'
          }
        }}
        key={leadDay}
      />  
    )
  );

  const displayedFcastLines = (
    <VictoryGroup displayName='Forecast' color='red'>
      {
        activeLeadDays.map((leadDay, i) => (
          <VictoryLine
            displayName={leadDay}
            name={leadDay}
            data={analysis.fcastData[leadDay[0]]}
            style={{
              data: {
                opacity: i >= 1 ? (9 - i)/10 : 1.0,
              }
            }}
            key={leadDay}
          />
        ))
      }
    </VictoryGroup>
  );


  const observedLine = (
    <VictoryGroup displayName='Actual' color='black'>
      <VictoryLine displayName='Actual' name='Actual' data={analysis.obsData} />
    </VictoryGroup>
  );

  const displayedErrea = (
    <VictoryGroup
      displayName='Error'
      style={{
        data: {
          opacity: (activeLeadDays[0][0] > 1 ? (9 - activeLeadDays[0][0])/10 : 1.0) * 0.4,
          fill: 'magenta',
          stroke: 'magenta'
        },
        symbol: { type: 'square'},
      }}
    >
      {activeLeadDays.length === 1
        ? analysis.errorData[activeLeadDays[0][0]].map((errea, i) => (
              <VictoryArea
                displayName={`Error-Area-${i}`}
                name={`Error-Area-${i}`}
                data={errea}
                key={`Error-Area-${i}`}
            />
          ))
        : []
      }
    </VictoryGroup>
  );
  
  const legendData = [
      ...allLeadDays.map((day) => {
        const line = displayedFcastLines.props.children.find((child) => child.props.name === day)
          || displayedFcastLines;
        const style = Object.assign({}, line.props.theme.line.style, line.props.style);
        return {
          name: day,
          symbol: {
            opacity: activeLeadDays.includes(day) ? style.data.opacity : 0.1,
            fill: displayedFcastLines.props.color,
            cursor: 'pointer',
          },
          labels: {
            opacity: activeLeadDays.includes(day) ? 1 : 0.2,
            cursor: 'pointer',
          }
        };
    }),
    ...[observedLine, displayedErrea].map((group) => {
      const style = Object.assign({}, group.props.theme.line.style, group.props.style);
      const opacity = group.props.children.length !== 0 ? 1 : 0.2;
      debugger
      return {
        name: group.props.displayName,
        symbol: {
          opacity,
          fill: style.data.stroke,
          cursor: 'pointer',
          type: style.symbol && style.symbol.type ? style.symbol.type : 'circle',
        },
        labels: {
          opacity,
          cursor: 'pointer',
        }
      }
    }).filter(Boolean)
  ];
  
  const toggleDisplayed = (labelName) => {
    const leadDay = labelName;
    if (allLeadDays.length === activeLeadDays.length) {
      if (labelName.includes('Error')) {
        setActiveLeadDays([allLeadDays[0]]);
      } else if (allLeadDays.includes(leadDay)) {
        setActiveLeadDays([leadDay]);
      }
    } else if (labelName === 'Actual' || activeLeadDays.includes(leadDay)) {
      setActiveLeadDays(allLeadDays);
    } else if (allLeadDays.includes(leadDay)) {
      setActiveLeadDays([leadDay]);
    }
    setActiveData([]);
  }

  return (
    <Container>
      <Row>
        <VictoryChart scale={{ x: "time" }} domainPadding={{ y: 20 }}
          padding={{ top: 50, bottom: 50, left: 50, right: 75 }}
          containerComponent={
            activeLeadDays.length > 1
              ? <VictoryContainer />
              : <VictoryVoronoiContainer
                voronoiDimension='x'
                labels={() => null}
                labelComponent={<Cursor />}
                onActivated={(points) => { setActiveData(points); }}
              />
          }
        >
          <VictoryLabel x={200} y={15} textAnchor='middle'
            text={weather.displayName}
          />
          <VictoryLegend x={25} y={25}
            orientation='horizontal'
            borderPadding={{ top: 0, bottom: 0, left: 5, right: 0 }}
            gutter={10}
            symbolSpacer={5}
            style={{ labels: { fontSize: 9 } }}
            data={ legendData }
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
            style={{
              ticks: { stroke: "black", size: 5 },
              tickLabels: { fontSize: 12 },
              grid: { stroke: 'grey' },
            }}
            offsetY={50}
          />
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            style={{
              grid: { stroke: 'grey' },
              tickLabels: { fontSize: 12 },
            }}
            label='°C'
            axisLabelComponent={<VictoryLabel dx={-15} angle={0} />}
          />

          {displayedErrea}
          {displayedFcastLines}
          {observedLine}
            
        </VictoryChart>
      </Row>
      <Row>
        <ActiveDataDisplay displayName={weather.displayName} data={activeData} />
      </Row>
    </Container>
  );
}

function Cursor({ x, scale }) {
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

/* * * Active Data Display * * */

function ActiveDataDisplay({ displayName, data }) {
  if (!data || data.length === 0) {
    return '';
  }
  const formattedData = [];
  let formattedErrorDatum;
  data.forEach((datum) => {
    if (!datum.childName.includes('Error')) {
      formattedData.push(<LabeledValue label={datum.childName} value={datum.y} key={datum.childName} />);
    } else {
      formattedErrorDatum = 
        <LabeledValue
          label='Forecast Error'
          value={datum.amount}
          key='Forecast Error'
          className='text-danger'
        />;
    }
  });

  if (!formattedErrorDatum) {
    const fcasts = data.filter((point) => point.childName !== 'Actual');
    const obs = data.filter((point) => point.childName === 'Actual');
    if (fcasts.length === 1 && obs.length === 1) {
      formattedErrorDatum =
        <LabeledValue
          label='Forecast Error'
          value={fcasts[0].y - obs[0].y}
          key='Forecast Error'
        />;
    }
  }

  if (formattedErrorDatum) {
    formattedData.push(formattedErrorDatum);
  }

  return (
    <Container>
      <Row>
        <h5 className='font-weight-normal'>
           {`${data[0].x.toLocaleString({dateStyle: 'short', timeStyle: 'short'})}`}
         </h5>
      </Row>
      <Row>
        <Col xs={12} className='font-weight-bold'>
          {displayName}
        </Col>
        <Col xs={12}>
          {formattedData}
        </Col>
      </Row>
    </Container>
  );
}

function LabeledValue(props) {
  return (
    <span className={`mr-3 ${props.className}`}>
      <span>{props.label}: </span>
      <span className='font-weight-light ml-2'>
        {
          `${Math.round(props.value * 10) / 10}`
        }
      </span>
    </span>
  );
}

/* * * Main App * * */

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
              .then((json) => { setAnalysis(formatDataForChart(json)); })
              .catch((error) => setResultsMessage(error.message));
          }}
        />
      </Row>
      <Row>
        {
          analysis
            ? <AnalysisChart analysis={analysis} />
            : resultsMessage
        }
      </Row>
    </Container>
  );
}

function formatDataForChart(json) {
  const weather = { propName: 'temperature', displayName: 'Temperature', errorThreshold: 1.67 };
  const obsData = json.obs.reduce((data, ob) => {
    if (ob.observed_weather[weather.propName]) {
      data.push({
        x: parseToUTC(ob.time),
        y: ob.observed_weather[weather.propName],
      });
    }
    return data;
  }, []);
  
  const [fcastData, errorData] = (() => {
    const forecasts = {};
    const errors = {};
    for (const day in json.fcasts) {
      forecasts[day] = [];
      errors[day] = [];
      json.fcasts[day].forEach((fcast) => {
        const time = parseToUTC(fcast.valid_time);
        const fcastValue = fcast.predicted_weather[weather.propName];
        forecasts[day].push({
          x: time,
          y: fcastValue,
        });

        const obs = obsData.filter((ob) => ob.x.valueOf() === time.valueOf());
        if (obs.length === 1 && Math.abs(fcastValue - obs[0].y) > weather.errorThreshold) {
          const erreaDatum = {
            x: time,
            y: fcastValue,
            y0: obs[0].y,
            amount: fcastValue - obs[0].y
          };
          const lastErrea = errors[day].length > 0 ? errors[day][errors[day].length - 1] : false;
          if (
            lastErrea
            && lastErrea.slice(-1)[0].x.valueOf() === time.valueOf() - 3600000
          ) {
            lastErrea.push(erreaDatum);
          } else {
            errors[day].push([erreaDatum]);
          }
        }
      });
    }

    return [forecasts, errors];
  })();
  
  return { obsData, fcastData, errorData, stats: json.errors };
}

export default AnalysisPage;
