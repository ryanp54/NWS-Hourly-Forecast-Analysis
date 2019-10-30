import React, {
  useState, useCallback, useMemo,
} from 'react';

import {
  Container, Row, Col, Button, Tabs, Tab,
} from 'react-bootstrap';

import {
  VictoryChart,
  VictoryAxis,
  VictoryArea,
  VictoryBar,
  VictoryGroup,
  VictoryLabel,
  VictoryLine,
  VictoryLegend,
  VictoryVoronoiContainer,
} from 'victory';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import './App.css';

import { getDaysAgo, getISODate } from './dateUtilities';
import { testData } from './testData';

const API_URL = '_self' in React.createElement('div')
  ? 'https://weather2019.appspot.com/OAX/forecasts/analyze?'
  : '/OAX/forecasts/analyze?';

function ForecastDayPicker({ label, onChange, ...rest }) {
  const [warned, setWarned] = useState(false);

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

function getActiveFcastsAndChartedData(analysis, activeDay) {
  const chartedData = [];
  const activeFcasts = activeDay ? [activeDay] : Object.keys(analysis.lead_days);

  // Add forecasts lines
  chartedData.push(
    <VictoryGroup displayName='Forecast' key='Forecast' color='red'>
      {
        activeFcasts.map((leadDay, i) => (
          <VictoryLine
            displayName={`${leadDay}-Day`}
            name={`${leadDay}-Day`}
            key={leadDay}
            data={Object.entries(analysis.lead_days[leadDay].fcasts)}
            x={(datum) => new Date(datum[0])}
            y={1}
            style={{
              data: {
                opacity: i >= 1 ? (9 - i) / 10 : 1.0,
              },
            }}
          />
        ))
      }
    </VictoryGroup>,
  );

  // Add observed weather line
  chartedData.push(
    <VictoryGroup displayName='Actual' key='Actual' color='black'>
      <VictoryLine
        displayName='Actual'
        name='Actual'
        data={Object.entries(analysis.obs)}
        x={(datum) => new Date(datum[0])}
        y={1}
      />
    </VictoryGroup>,
  );

  const erreas = [];
  if (activeDay) {
    erreas.push(
      ...Object.entries(analysis.lead_days[activeDay].errors).reduce(
        // Create data for error VictoryAreas and organize into contiguous areas.
        (erreas, [timeStr, amount]) => {
          const time = new Date(timeStr);
          const erreaDatum = {
            x: time,
            y: analysis.lead_days[activeDay].fcasts[timeStr],
            y0: analysis.obs[timeStr],
            amount,
          };

          const lastErrea = erreas.length > 0 ? erreas[erreas.length - 1] : false;
          if (
            lastErrea
            && lastErrea.slice(-1)[0].x.valueOf() === time.valueOf() - 3600000
          ) {
            lastErrea.push(erreaDatum);
          } else {
            erreas.push([erreaDatum]);
          }

          return erreas;
        },
        [],
      ).map((errea, i) => (
        <VictoryArea
            displayName={`Error-Area-${i}`}
            name={`Error-Area-${i}`}
            data={errea}
            key={`Error-Area-${i}`}
        />
      )),
    );
  }

  // Add error areas.
  chartedData.push(
    <VictoryGroup
      displayName='Error' key='Error'
      style={{
        data: {
          opacity: 0.4,
          fill: 'magenta',
          stroke: 'magenta',
        },
        legendSymbol: { type: 'square' },
      }}
    >
      {erreas}
    </VictoryGroup>,
  );

  return [activeFcasts, chartedData];
}

function getLegendData(analysis, chartedGroups) {
  const legendData = [];
  const forecastGroup = chartedGroups.find((group) => group.props.displayName === 'Forecast');
  const otherGroups = chartedGroups.filter((group) => group.props.displayName !== 'Forecast');

  // Always add all forcasts available so they can be clicked to be activated.
  legendData.push(
    ...Object.keys(analysis.lead_days).map((day) => {
      const dayLabel = `${day}-Day`;

      // Find line if forecast lead-day is displayed and record styles to use.
      const line = forecastGroup.props.children.find(
        (child) => child.props.name === dayLabel,
      );
      const style = line && { ...line.props.theme.line.style, ...line.props.style };

      return {
        name: `${day}-Day`,
        symbol: {
          opacity: line ? style.data.opacity : 0.1,
          fill: forecastGroup.props.color,
          cursor: 'pointer',
        },
        labels: {
          opacity: line ? 1 : 0.2,
          cursor: 'pointer',
        },
      };
    }),
  );

  // Add other groups and style as active or inactive based on weather the actually have any
  // charted data.
  legendData.push(
    ...otherGroups.map(
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
    ),
  );

  return legendData;
}

const ForecastChart = ({ analysis, activeDay, onChange }) => {
  const [activeFcasts, chartedData] = getActiveFcastsAndChartedData(analysis, activeDay);
  const legendData = getLegendData(analysis, chartedData);

  const toggleDisplayed = (labelName) => {
    const allFcastDays = Object.keys(analysis.lead_days);
    const [day] = labelName.split('-Day');
    let newActiveDay = false;
    if (!activeDay) {
      if (labelName.includes('Error')) {
        [newActiveDay] = activeFcasts;
      } else if (allFcastDays.includes(day)) {
        newActiveDay = day;
      }
    } else if (labelName === 'Actual' || activeFcasts.includes(day)) {
      newActiveDay = null;
    } else if (allFcastDays.includes(day)) {
      newActiveDay = day;
    }
    onChange(newActiveDay, []);
  };

  return (
    <Container className='pt-3'>
      <Row>
        <ErrorStatsDisplay
          activeDay={activeDay}
          analysis={analysis}
        />
      </Row>
      <Row>
        <VictoryChart scale={{ x: 'time' }} domainPadding={{ y: 20 }}
          padding={{
            top: 25, bottom: 50, left: 50, right: 75,
          }}
          containerComponent={
            <VictoryVoronoiContainer
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
            label={analysis.metadata.units}
            axisLabelComponent={<VictoryLabel dx={-15} angle={0} />}
          />

          {chartedData}

        </VictoryChart>
      </Row>
    </Container>
  );
};

function ErrorStatsDisplay({ analysis, activeDay }) {
  const activeDayDisplayText = !activeDay ? 'Cumulative' : `${activeDay}-Day`;
  const stats = !activeDay ? analysis.cumulative_stats : analysis.lead_days[activeDay].stats;

  return (
    <Container>
      <Row className='d-flex justify-content-center'>
        <h6>
          {`Forecast Accuracy: ${activeDayDisplayText}`}
        </h6>
      </Row>
      <Row className='d-flex justify-content-center'>
          {
            Object.keys(stats).map((type) => (
              Object.keys(stats[type]).map((prop) => {
                if (type.includes(prop)) {
                  return (
                    <LabeledValue
                     label={type}
                     value={stats[type][prop]}
                     units={analysis.metadata.units}
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

function BinsChart({ analysis, activeDay, onChange }) {
  const activeAnalysis = activeDay
    ? analysis.lead_days[activeDay].stats
    : analysis.cumulative_stats;
  const data = Object.entries(activeAnalysis.bin_count.bins);

  const legendData = Object.keys(analysis.lead_days).map((day) => (
    {
      name: `${day}-Day`,
      symbol: {
        opacity: activeDay === day ? 1.0 : 0.2,
        fill: 'darkblue',
        type: 'square',
        cursor: 'pointer',
      },
      labels: {
        opacity: activeDay === day ? 1.0 : 0.3,
        cursor: 'pointer',
      },
    }
  ));
  legendData.push({
    name: 'Cumulative',
    symbol: {
      opacity: !activeDay ? 1.0 : 0.2,
      fill: 'darkblue',
      type: 'square',
      cursor: 'pointer',
    },
    labels: {
      opacity: !activeDay ? 1.0 : 0.3,
      cursor: 'pointer',
    },
  })
  legendData.push({ name: 'Expected', symbol: { fill: 'lightblue', type: 'square' } });

  const toggleDisplayed = (labelName) => {
    const [day] = labelName === 'Cumulative' ? [null] : labelName.split('-Day');
    let newActiveDay = false;
    if (activeDay !== day && day !== 'Expected') {
      newActiveDay = day;
    }
    onChange(newActiveDay, []);
  };

  return (
    <Container className='pt-3'>
      <Row className='d-flex justify-content-center'>
        <h6>
          {`Precipitation Chance Bin Counts`}
        </h6>
      </Row>
      <Row className='d-flex justify-content-center'>
        <LabeledValue
          label='Bias'
          value={activeAnalysis.bin_count.bias}
          units='%'
        />
      </Row>
      <Row>
        <VictoryChart
          padding={{
            top: 25, bottom: 50, left: 50, right: 75,
          }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension='x'
              labels={() => null}
              labelComponent={<Cursor />}
              onActivated={(points) => onChange(false, points)}
            />
          }
        >
          <VictoryLegend
            x={15} y={5}
            orientation='horizontal'
            borderPadding={{
              top: 0, bottom: 0, left: 5, right: 0,
            }}
            gutter={10}
            symbolSpacer={5}
            style={{ labels: { fontSize: 9 } }}
            data={legendData}
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
            style={{
              ticks: { stroke: 'black', size: 5 },
              tickLabels: { fontSize: 12 },
              grid: { stroke: 'grey' },
            }}
            label='Forecasted chance of pricipitation (%)'
            offsetY={50}
            axisLabelComponent={<VictoryLabel dy={5} style={{ fontSize: 11 }} />}
          />
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            style={{
              grid: { stroke: 'grey' },
              tickLabels: { fontSize: 12 },
            }}
            label='Number of precipitation observations'
            axisLabelComponent={<VictoryLabel dy={-5} angle={-90} style={{ fontSize: 11 }} />}
          />

          <VictoryGroup
            colorScale={['darkblue', 'lightblue']}
            offset={5}
          >
            <VictoryBar
              name='Observed occurances'
              data={data}
              x={0}
              y={(datum) => datum[1].obs}
            />
            <VictoryBar
              name='Predicted occurances'
              data={data}
              x={0}
              y={(datum) => datum[1].fcasts * (datum[0] / 100)}
            />
          </VictoryGroup>

        </VictoryChart>
      </Row>
    </Container>
  );
}

function AnalysisChart({ analysis }) {
  const [activeFcastDay, setActiveFcastDay] = useState(null);
  const [activeData, setActiveData] = useState([]);

  const handleChange = useCallback(
    (newActiveDay, newActiveData) => {
      debugger
      if (newActiveDay !== false) {
        setActiveFcastDay(newActiveDay);
      }
      if (newActiveData) {
        setActiveData(newActiveData);
      }
    },
    [],
  );

  let chart;
  let detail;
  if (analysis.metadata.prop_name === 'precip_chance') {
    chart = <BinsChart analysis={analysis} activeDay={activeFcastDay} onChange={handleChange} />;
    detail = (
      <ActiveDataDisplay
        displayInfo={{
          ...analysis.metadata,
          ...{ units: { x: analysis.metadata.units, y: '' } },
        }}
        data={activeData}
      />
    );
  } else {
    chart = (
      <MemodForecastChart
        analysis={analysis}
        activeDay={activeFcastDay}
        onChange={handleChange}
      />
    );
    detail = (
      <ActiveDataDisplay
        displayInfo={analysis.metadata}
        data={activeData}
      />
    );
  }

  return (
    <Container>
      <Row>
        {chart}
      </Row>
      <Row>
        {detail}
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

function ActiveDataDisplay({ displayInfo, data }) {
  if (!data || data.length === 0) {
    return '';
  }

  let { units } = displayInfo;
  if (!units || Object.getPrototypeOf(units) !== Object.prototype) {
    units = { x: units, y: units };
  }

  // Format header text depending on type of charted data
  let header = displayInfo.display_name || '';
  let xDesc = '';
  if (data[0]._x instanceof Date) {
    const [date, time] = data[0]._x
      .toLocaleString({ dateStyle: 'short', timeStyle: 'short' }).split(',');
    xDesc = `${header && ' on '}${date} at ${time}`;
  } else {
    xDesc = `${header && ': '}${data[0][0]} ${units.x}`;
  }
  header = `${header}${xDesc}`;


  const formattedData = [];
  let formattedErrorDatum;
  data.forEach((datum) => {
    if (datum._y === null) {
      return;
    }

    if (!datum.childName.includes('Error')) {
      formattedData.push(
        <LabeledValue
          label={datum.childName}
          value={datum._y}
          units={units.y}
          key={datum.childName}
        />,
      );
    } else {
      formattedErrorDatum = <LabeledValue
          label='Forecast Error'
          value={datum.amount}
          units={units.y}
          key='Forecast Error'
          className='text-danger'
        />;
    }
  });

  // Error LabeledValue is pushed at the end so that it is displayed last.
  if (formattedErrorDatum) {
    formattedData.push(formattedErrorDatum);
  }

  return (
    <Container className='h6 font-weight-normal'>
      <Row className='pb-2'>
        {header}
      </Row>
      <Row>
        {formattedData}
      </Row>
    </Container>
  );
}

function LabeledValue({
  label, value, type, units, className,
}) {
  const formatForDisplay = (val, unit) => `${Math.round(val * 10) / 10} ${unit}`;
  const valueType = (type || label).toLowerCase();

  let formattedValue;
  if (valueType === 'accuracy') {
    formattedValue = formatForDisplay(value * 100.0, '%');
  } else {
    formattedValue = formatForDisplay(value, units);
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
  const [weather, setWeather] = useState('temperature');
  const [analysis, setAnalysis] = useState(JSON.parse(testData));
  const [statusMessage, setStatusMessage] = useState('Select date range.');

  // List of weather types Analysis chart is set-up to handle.
  // TODO: Finish all and refator to something more appropriate.
  const workingWeathers = ['temperature', 'dewpoint', 'wind_speed', 'cloud_cover', 'precip_chance'];

  return (
    <Container>
      <Row className='py-4'>
        <DateRangeForm
          onFetch={(request) => {
            setStatusMessage('Retrieving...');
            setAnalysis(null);
            request.then((resp) => resp.json())
              .then((json) => {
                setAnalysis(json);
              }).catch((error) => setStatusMessage(error.message));
          }}
        />
      </Row>
      {
        analysis
          ? (
            <Row>
              <Container>
                <Tabs activeKey={weather} onSelect={(key) => setWeather(key)} justify className='h6'>
                  {
                    workingWeathers.map((weatherType) => (
                      <Tab
                        eventKey={analysis[weatherType].metadata.prop_name}
                        title={analysis[weatherType].metadata.display_name}
                        key={analysis[weatherType].metadata.prop_name}
                      />
                    ))
                  }
                </Tabs>
              </Container>
              <AnalysisChart
                analysis={analysis[weather]}
              />
            </Row>
          )
          : <Row> {statusMessage} </Row>
        }
    </Container>
  );
}

export default AnalysisPage;