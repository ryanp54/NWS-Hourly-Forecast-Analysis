import React, { useState, useEffect, useCallback } from 'react';

import {
  Container,
  Row,
  Col,
  Tabs,
  Tab,
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

import { toTitleCase, getMidnightDateOrTime } from './helpers';

const fontFamily = 'inherit';

// Allow navigation between the weather AnalysisCharts available via Tabs.
export default function ForecastAnalysis({ analysis }) {
  const [weather, setWeather] = useState('temperature');

  // The weather type property names AnalysisChart is set up to handle.
  const workingWeathers = [
    'temperature',
    'dewpoint',
    'wind_speed',
    'cloud_cover',
    'precip_chance',
  ];

  return (
    <div>
      <Container className='pb-3'>
        <Row>
          <Col>
            <Tabs justify
              activeKey={weather}
              onSelect={(key) => setWeather(key)}
            >
              {workingWeathers.map((weatherType) => (
                <Tab className='align-center'
                  eventKey={weatherType}
                  title={
                    !Object.keys(analysis).includes(weatherType)
                      ? toTitleCase(weatherType)
                      : analysis[weatherType].metadata.display_name
                    }
                  key={weatherType}
                  disabled={!Object.keys(analysis).includes(weatherType)}
                />
              ))}
            </Tabs>
          </Col>
        </Row>
      </Container>
      
      <AnalysisChart
        analysis={analysis[weather]}
      />
    </div>
  );
}

// Handle setting up the correct chart and ActiveDataDisplay based on the weather type of the
// analysis prop, and update these components when changes occur.
function AnalysisChart({ analysis }) {
  const [activeData, setActiveData] = useState([]);

  // Memomize callback so memoized children it's passed to don't render unnecessarily.
  const handleChange = useCallback(setActiveData, []);

  // Make sure activeData gets reset when chart switches.
  useEffect(() => setActiveData([]), [analysis]);

  let chart;
  let activeDataDetail;
  if (analysis.metadata.prop_name === 'precip_chance') {
    chart = <MemodBinsChart analysis={analysis} onCursorChange={handleChange} />;
    activeDataDetail = (
      <ActiveDataDisplay
        displayInfo={{
          // Overwrite units property of metadata to make y unitless.
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
        onCursorChange={handleChange}
      />
    );
    activeDataDetail = (
      <ActiveDataDisplay
        displayInfo={analysis.metadata}
        data={activeData}
      />
    );
  }

  return (
    <Col>
      <ChartContainer>
        {chart}
      </ChartContainer>
      <Container>
        <Row>
          <Col xs={11}
            // Hold vertical space for element even when empty to avoid frequent
            // addition/removal of scroll bar.
            style={{ minHeight: '75px'}}>
            {activeDataDetail}
          </Col>
        </Row>
      </Container>
    </Col>
  );
}

// Custom Container for Charts limit Charts to a reasonable size range. Should not have
// any regular Containers as its ancestors.
function ChartContainer({ children }) {
  return (
    <div
      style={{
        minWidth: '335px',
        maxWidth: '970px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      {children}
    </div>
  );
}

// Display visualization of analysis inlcuding a chart of forecasted vs observed values and
// highlight areas where the forecast was considered inaccurate. The chart includes a
// TitleStatsDisplay as a title that displays the forecast stats and an interactive legend that
// allows selection of which lead day time forecast to display. When the mouse cursor moves over
// the chart onCursorChange will be passed a list of the nearest data point objects.
// Rendering is expensive. Use the memoized version available as MemodForecastChart.
function ForecastChart({ analysis, onCursorChange }) {
  // All forecasts will be displayed when activeDay is falsey.
  const [activeDay, setActiveDay] = useState(null);

  const activeFcasts = getActiveFcasts(analysis, activeDay);
  const chartedData = getChartedData(analysis, activeDay);
  const legendData = getLegendData(analysis, chartedData);

  // Called by the onClick handler of the VictoryLegend.
  const toggleDisplayed = (labelName) => {
    const allFcastDays = Object.keys(analysis.lead_days);
    const [day] = labelName.split('-Day');

    if (!activeDay && labelName.includes('Error')) {
      setActiveDay(activeFcasts[0]);
    } else if ((!activeDay || !activeFcasts.includes(day)) && allFcastDays.includes(day)) {
      setActiveDay(day);
    } else if (labelName === 'Actual' || activeFcasts.includes(day)) {
      setActiveDay(null);
    }

    // Reset cursor's nearest data points.
    onCursorChange([]);
  };

  return (
    <Row className='pt-3'>
      <TitleStatsDisplay
        activeDay={activeDay}
        analysis={analysis}
      />
      <Col xs={12} className='w-100'>
        <VictoryChart
          scale={{ x: 'time' }}
          domainPadding={{ y: 20 }}
          padding={{
            top: 25, bottom: 50, left: 50, right: 75,
          }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension='x'
              labels={() => null} // Otherwise Cursor is not displayed.
              labelComponent={<Cursor />}
              onActivated={(points) => onCursorChange(points)}
            />
          }
        >

          <VictoryAxis
            tickCount={6}
            tickFormat={getMidnightDateOrTime}
            style={{
              ticks: { stroke: 'black', size: 5 },
              tickLabels: { fontSize: 9, fontFamily },
              grid: { stroke: 'grey' },
            }}
            offsetY={50}
          />
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            axisLabelComponent={<VictoryLabel dx={-15} angle={0} />}
            label={analysis.metadata.units}
            style={{
              grid: { stroke: 'grey' },
              tickLabels: { fontSize: 9, fontFamily },
            }}
          />

          <VictoryLegend
            data={legendData}
            events={[{
              eventHandlers: {
                onClick: (evt, target) => {
                  if (target && target.datum) {
                    toggleDisplayed(target.datum.name);
                  }
                },
              },
            }]}
            x={25} y={10}
            orientation='horizontal'
            borderPadding={{
              top: 0, bottom: 0, left: 5, right: 0,
            }}
            gutter={10}
            symbolSpacer={5}
            style={{ labels: { fontSize: 8, fontFamily } }}
          />

          {chartedData}

        </VictoryChart>
      </Col>
    </Row>
  );
}
const MemodForecastChart = React.memo(ForecastChart);

// Return an array of integers in string form that correspond to the active forecast lead days.
function getActiveFcasts(analysis, activeDay) {
  return activeDay ? [activeDay] : Object.keys(analysis.lead_days);
}

// Generate and return an array of VictoryChart components to be charted on the ForecastChart.
// ActiveDataDisplay, getLegendData, and the local toggleDisplay in ForecastChart depend on the
// implementation details here, most significantly, the name and displayName prop values.
function getChartedData(analysis, activeDay) {
  const chartedData = [];
  const activeFcasts = getActiveFcasts(analysis, activeDay);

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
                opacity: i >= 1 ? (8 - i) / 10 : 1.0,
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

  // Forecast errors should only be charted when a single forecast lead day is active.
  let erreas = [];
  if (activeDay) {
    erreas = Object.entries(analysis.lead_days[activeDay].errors).reduce(
      // Create data points for error VictoryAreas and organize into an array of arrays of
      // data for the separate contiguous VictoryAreas.
      (errors, [timeStr, amount]) => {
        const time = new Date(timeStr);
        const erreaDatum = {
          x: time,
          y: analysis.lead_days[activeDay].fcasts[timeStr],
          y0: analysis.obs[timeStr],
          amount,
        };

        const lastErrea = errors.length > 0 ? errors[errors.length - 1] : false;
        if (
          lastErrea
          && lastErrea.slice(-1)[0].x.valueOf() === time.valueOf() - 3600000
        ) {
          lastErrea.push(erreaDatum);
        } else {
          errors.push([erreaDatum]);
        }

        return errors;
      },
      [],
    ).map((errea, i) => (
      // Now actually create the VictoryAreas from the data.
      <VictoryArea displayName={`Error-Area-${i}`} key={`Error-Area-${i}`}
        name={`Error-Area-${i}`}
        data={errea}
      />
    ));
  }

  // Add the VictoryAreas that were created.
  chartedData.push(
    <VictoryGroup
      displayName='Error' key='Error'
      style={{
        data: {
          opacity: 0.4,
          fill: 'magenta',
          stroke: 'magenta',
        },
        // getLegendData will use this attribute as the symbol type when it's present.
        legendSymbol: { type: 'square' },
      }}
    >
      {erreas}
    </VictoryGroup>,
  );

  return chartedData;
}

// Generate the keys(data) for the chart legend. The name attributes that are set are especially
// important as they are passed to toggleDisplay in ForecastChart.
function getLegendData(analysis, chartedGroups) {
  const legendData = [];
  const forecastGroup = chartedGroups.find((group) => group.props.displayName === 'Forecast');
  const otherGroups = chartedGroups.filter((group) => group.props.displayName !== 'Forecast');

  // Always add all forcasts available in the analysis so they can be clicked to be activated.
  legendData.push(
    ...Object.keys(analysis.lead_days).map((day) => {
      const dayLabel = `${day}-Day`;

      // Find line if forecast lead-day is displayed and set styling accordingly.
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

// Display a vertical line on chart at the x position. Use to show mouse pointer position on chart.
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

function TitleStatsDisplay({ analysis, activeDay }) {
  const activeDayDisplayText = !activeDay ? 'Cumulative' : `${activeDay}-Day`;
  const stats = !activeDay ? analysis.cumulative_stats : analysis.lead_days[activeDay].stats;

  return (
    <Col xs={12} className='w-100'>
      <Row className='d-flex justify-content-center'>
        <h4>
          Forecast Accuracy:
        </h4>
        <h4 className='ml-2'>
          {activeDayDisplayText}
        </h4>
      </Row>
      <Row className='d-flex justify-content-center'>
          {
            // Stats objects contain multiple entries, but happen to always include the key of the
            // parent in the entry that contains the actual value we want to display.
            // TODO: refactor to be less obtuse.
            Object.keys(stats).map((type) => (
              Object.keys(stats[type]).map((prop) => {
                if (type.includes(prop)) {
                  return (
                    <LabeledValue className='h5'
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
    </Col>
  );
}

// Display active data points. displayInfo be a string or object with x and y attributes of the
// units to be used with the data points and data should be a list of the datum objects.
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
    <Col>
      <Row className='pb-2'>
        {header}
      </Row>
      <Row>
        {formattedData}
      </Row>
    </Col>
  );
}

// Display text in the form label: value units. className is appended to the containing span's
// className and is optional.
// TODO: Eliminate the need for type by handling special accuracy formatting else where.
function LabeledValue({
  label, value, units, type, className,
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

// Analogous to ForecastChart, but for precip probablity forcasts.
// TODO: Refactor this and ForcastChart to eliminiate redundant code.
function BinsChart({ analysis, onCursorChange }) {
  // Cumulative stats will be displayed when activeDay is falsey.
  const [activeDay, setActiveDay] = useState(null);

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
  });
  legendData.push({ name: 'Expected', symbol: { fill: 'lightblue', type: 'square' } });

  const toggleDisplayed = (labelName) => {
    const [day] = labelName === 'Cumulative' ? [null] : labelName.split('-Day');
    if (activeDay !== day && day !== 'Expected') {
      setActiveDay(day);
    }

    onCursorChange([]);
  };

  return (
    <Row className='py-3'>
      <Col xs={12} className='w-100'>
        <Row className='d-flex justify-content-center'>
          <h4>
            Precipitation Chance
          </h4>
          <h4 className='ml-2'>
            Bin Counts
          </h4>
        </Row>
        <Row className='d-flex justify-content-center'>
          <LabeledValue className='h5'
            label='Bias'
            value={activeAnalysis.bin_count.bias}
            units='%'
          />
        </Row>
      </Col>
      <Col xs={12} className='w-100'>
        <VictoryChart
          padding={{
            top: 25, bottom: 50, left: 50, right: 75,
          }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension='x'
              labels={() => null}
              labelComponent={<Cursor />}
              onActivated={(points) => onCursorChange(points)}
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
            style={{ labels: { fontSize: 8, fontFamily } }}
            data={legendData}
            events={[{
              eventHandlers: {
                onClick: (evt, target, i, legend) => {
                  if (target && target.datum) {
                    toggleDisplayed(target.datum.name);
                  }
                },
              },
            }]}
          />

          <VictoryAxis
            style={{
              ticks: { stroke: 'black', size: 5 },
              tickLabels: { fontSize: 11, fontFamily },
              grid: { stroke: 'grey' },
            }}
            label='Forecasted chance of pricipitation (%)'
            offsetY={50}
            axisLabelComponent={<VictoryLabel dy={10} style={{ fontSize: 10, fontFamily }} />}
          />
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            style={{
              grid: { stroke: 'grey' },
              tickLabels: { fontSize: 11, fontFamily },
            }}
            label='Number of precipitation observations'
            axisLabelComponent={<VictoryLabel dy={-10} angle={-90}
              style={{ fontSize: 10, fontFamily }} />}
          />

          <VictoryGroup
            colorScale={['darkblue', 'lightblue']}
            offset={5}
          >
            <VictoryBar
              name='Observed occurances'
              data={data}
              x={0}
              y={[1, 'obs']}
            />
            <VictoryBar
              name='Predicted occurances'
              data={data}
              x={0}
              y={[1, 'predicted']}
            />
          </VictoryGroup>

        </VictoryChart>
      </Col>
    </Row>
  );
}
const MemodBinsChart = React.memo(BinsChart);