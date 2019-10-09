import React, {
  useState, useCallback, useMemo,
} from 'react';

import {
  Container, Row, Col, Button,
} from 'react-bootstrap';

import {
  Rect,
  Text,
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

import './App.css';

import { getDaysAgo, getISODate, parseToUTC } from './dateUtilities';
import { testData } from './testData';

const API_URL = '_self' in React.createElement('div')
  ? 'https://weather2019.appspot.com/OAX/forecasts/analyze?'
  : '/OAX/forecasts/analyze?';

function ForecastDayPicker({ label, onChange, ...rest }) {
  const [warned, setWarned] = useState(false);

  return (
    <Col md={'auto'} className='pb-3'>
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
            dayPickerProps={{
              disabledDays: {
                before: new Date(2019, 1, 1),
                after: getDaysAgo(2),
              },
            }}
          />
        </Col>
      </Row>
    </Col>
  );
}

function DateRangeForm({ onFetch }) {
  const [start, setStart] = useState(getDaysAgo(10));
  const [end, setEnd] = useState(getDaysAgo(3));

  const fetchReturn = () => (
    onFetch(fetch(`${API_URL}start=${getISODate(start)}&end=${getISODate(end)}`))
  );

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
            onClick={fetchReturn}
          >
            Submit
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

const ForecastChart = ({ analysis, weather, activeDays, onChange }) => {
  const displayedFcastLines = (
    <VictoryGroup displayName='Forecast' color='red'>
      {
        activeDays.map((leadDay, i) => (
          <VictoryLine
            displayName={leadDay}
            name={leadDay}
            data={analysis.fcastData[leadDay[0]]}
            style={{
              data: {
                opacity: i >= 1 ? (9 - i) / 10 : 1.0,
              },
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
          opacity: 0.4,
          fill: 'magenta',
          stroke: 'magenta',
        },
        legendSymbol: { type: 'square' },
      }}
    >
      {activeDays.length === 1
        ? analysis.errorData[activeDays[0][0]].map((errea, i) => (
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
    ...analysis.allFcastDays.map(
      (day) => {
        const line = displayedFcastLines.props.children.find((child) => child.props.name === day)
            || displayedFcastLines;
        const style = { ...line.props.theme.line.style, ...line.props.style };
        return {
          name: day,
          symbol: {
            opacity: activeDays.includes(day) ? style.data.opacity : 0.1,
            fill: displayedFcastLines.props.color,
            cursor: 'pointer',
          },
          labels: {
            opacity: activeDays.includes(day) ? 1 : 0.2,
            cursor: 'pointer',
          },
        };
      },
    ),
    ...[observedLine, displayedErrea].map(
      (group) => {
        const style = { ...group.props.theme.line.style, ...group.props.style };
        const isCharted = group.props.children.length !== 0;
        return {
          name: group.props.displayName,
          symbol: {
            opacity: isCharted ? style.data.opacity : 0.2,
            fill: style.data.stroke,
            cursor: 'pointer',
            type: style.legendSymbol && style.legendSymbol.type ? style.legendSymbol.type : 'circle',
          },
          labels: {
            opacity: isCharted ? 1 : 0.2,
            cursor: 'pointer',
          },
        };
      },
    ).filter(Boolean),
  ];

  const toggleDisplayed = (labelName) => {
    let newActiveDays = false;
    if (analysis.allFcastDays.length === activeDays.length) {
      if (labelName.includes('Error')) {
        newActiveDays = [analysis.allFcastDays[0]];
      } else if (analysis.allFcastDays.includes(labelName)) {
        newActiveDays = [labelName];
      }
    } else if (labelName === 'Actual' || activeDays.includes(labelName)) {
      newActiveDays = analysis.allFcastDays;
    } else if (analysis.allFcastDays.includes(labelName)) {
      newActiveDays = [labelName];
    }
    onChange(newActiveDays, []);
  };

  return (
    <Container className='pt-3'>
      <Row>
        <ErrorStatsDisplay
          activeDay={activeDays[0]}
          stats={analysis.stats}
          weather={weather}
        />
      </Row>
      <Row>
        <VictoryChart scale={{ x: 'time' }} domainPadding={{ y: 20 }}
          padding={{
            top: 25, bottom: 50, left: 50, right: 75,
          }}
          containerComponent={
            activeDays.length > 1
              ? <VictoryContainer />
              : <VictoryVoronoiContainer
                voronoiDimension='x'
                labels={() => null}
                labelComponent={<Cursor />}
                onActivated={(points) => onChange(false, points)}
              />
          }
        >
          <VictoryLegend x={25} y={10}
            orientation='horizontal'
            borderPadding={{
              top: 0, bottom: 0, left: 5, right: 0,
            }}
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
                },
              },
            }]}
          />

          <VictoryAxis
            tickCount={6}
            tickFormat={(dateTime) => {
              const date = `${dateTime.getMonth() + 1}/${dateTime.getDate()}`;
              const time = dateTime.toLocaleTimeString().split(/[:\s]/);
              return dateTime.getHours() ? `${time[0]} ${time.slice(-1)}` : date;
            }}
            style={{
              ticks: { stroke: 'black', size: 5 },
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
    </Container>
  );
};

function ErrorStatsDisplay({ stats, weather, activeDay }) {
  const activeStats = stats[activeDay[0]][weather.propName];
  return (
    <Container>
      <Row className='d-flex justify-content-center'>
        <h5 className='font-weight-normal'>
          {`${weather.displayName} Forecast Accuracy: ${activeDay}`}
        </h5>
      </Row>
      <Row className='d-flex justify-content-center'>
          {
            Object.keys(activeStats).map((type) => (
              Object.keys(activeStats[type]).map((prop) => {
                if (type.includes(prop)) {
                  return (
                    <LabeledValue
                     label={type}
                     value={activeStats[type][prop]}
                     key={prop}
                   />
                  );
                }
                return false;
              })
            )).flat().filter(Boolean)
          }
      </Row>
    </Container>
  );
}

// Clean up props that cause error messages.
function CustomG({ children, ...rest }) {
  rest.standalone = rest.standalone.toString();
  delete rest.stringMap

  return <g { ...rest }> {children} </g>;
}

function Cursor({ x, scale }) {
  const range = scale.y.range();
  return (
    <line
      style={{
        stroke: 'lightgrey',
        strokeWidth: 1,
      }}
      x1={x}
      x2={x}
      y1={Math.max(...range)}
      y2={Math.min(...range)}
    />
  );
}

const MemodForecastChart = React.memo(ForecastChart);

function AnalysisChart({ analysis, weather }) {
  const [activeFcastDays, setActiveFcastDays] = useState(analysis.allFcastDays);
  const [activeData, setActiveData] = useState([]);

  const handleChange = useCallback(
    (newActiveDays, newActiveData) => {
      if (newActiveDays) {
        setActiveFcastDays(newActiveDays);
      }
      if (newActiveData) {
        setActiveData(newActiveData);
      }
    },
    [],
  );

  return (
    <Container>
      <Row>
        <MemodForecastChart
          analysis={analysis}
          weather={weather}
          activeDays={activeFcastDays}
          onChange={handleChange}
        />
      </Row>
      <Row>
        <ActiveDataDisplay
          displayName={weather.displayName}
          data={activeData}
        />
      </Row>
    </Container>
  );
}

function toTitleCase(str) {
  return (
    str.replace(
      /_/,
      ' ',
    ).replace(
      /(?:(^|\(|"|\s|-|,)\w)\w+/g,
      (match) => (match === match.toUpperCase() ? match.toLowerCase() : match),
    ).replace(
      /(?:^|\(|"|\s|-|,)\w/g,
      (match) => match.toUpperCase(),
    )
  );
}

/* * * Current Data Detail Display * * */

function ActiveDataDisplay({ displayName, data }) {
  if (!data || data.length === 0) {
    return '';
  }
  const formattedData = [];
  let formattedErrorDatum;
  data.forEach((datum) => {
    if (!datum.childName.includes('Error')) {
      formattedData.push(
        <LabeledValue
          label={datum.childName}
          value={datum.y}
          key={datum.childName}
        />,
      );
    } else {
      formattedErrorDatum = <LabeledValue
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
      formattedErrorDatum = <LabeledValue
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
           {`${data[0].x.toLocaleString({ dateStyle: 'short', timeStyle: 'short' })}`}
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

function LabeledValue({
  label, value, type, className,
}) {
  const formatForDisplay = (val, units) => `${Math.round(val * 10) / 10}${units}`;
  const valueType = (type || label).toLowerCase();

  let formattedValue;
  if (valueType === 'accuracy') {
    formattedValue = formatForDisplay(value * 100.0, '%');
  } else if (valueType.includes('bias')) {
    formattedValue = formatForDisplay(value, '');
  } else {
    formattedValue = formatForDisplay(value, '°C');
  }
  return (
    <span className={`mr-3 d-inline-block ${className}`}>
      <span> {toTitleCase(label)}: </span>
      <span className='font-weight-light ml-2'> {formattedValue} </span>
    </span>
  );
}

/* * * Main App * * */

function AnalysisPage() {
  const weather = useMemo(() => (
    { propName: 'temperature', displayName: 'Temperature', errorThreshold: 1.67 }
  ), []);
  const [analysis, setAnalysis] = useState(formatDataForChart(JSON.parse(testData), weather));
  const [resultsMessage, setResultsMessage] = useState('Select date range.');

  return (
    <Container>
      <Row>
        <DateRangeForm
          onFetch={(request) => {
            setResultsMessage('Retrieving...');
            setAnalysis(null);
            request.then((resp) => resp.json())
              .then((json) => { setAnalysis(formatDataForChart(json, weather)); })
              .catch((error) => setResultsMessage(error.message));
          }}
        />
      </Row>
      <Row>
        {
          analysis
            ? <AnalysisChart analysis={analysis} weather={weather} />
            : resultsMessage
        }
      </Row>
    </Container>
  );
}

function formatDataForChart(json, weather) {
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
    Object.keys(json.fcasts).forEach((day) => {
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
            amount: fcastValue - obs[0].y,
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
    });

    return [forecasts, errors];
  })();

  return {
    obsData,
    fcastData,
    errorData,
    stats: json.errors,
    allFcastDays: Object.keys(fcastData).map((key) => `${key}-Day`),
  };
}

export default AnalysisPage;