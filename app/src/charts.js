import React, { useState } from 'react';

import { Row, Col } from 'react-bootstrap';

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

import LabeledValue from './LabeledValue';
import { getMidnightDateOrTime } from './helpers';

const fontFamily = 'inherit';

export const ForecastChart = React.memo(
  function ({
    analysis,
    onCursorChange,
    activeDay,
    setActiveDay
  }) {
    const chartedData = getChartedData(analysis, activeDay);
    const legendData = getLegendData(analysis, chartedData);  

    return (
      <BaseChart
        analysis={analysis}
        activeDay={activeDay}
        setActiveDay={setActiveDay}
        legendData={legendData}
        onCursorChange={onCursorChange}
        titleElement={<ForecastTitle activeDay={activeDay} />}
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
          key='independent'
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
          key='dependent'
        />
          {chartedData}
      </BaseChart>
    );
  }
);

export const PrecipChanceChart = React.memo(
  function ({
    analysis,
    onCursorChange,
    activeDay,
    setActiveDay
  }) {
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

    return (
      <BaseChart
        analysis={analysis}
        activeDay={activeDay}
        setActiveDay={setActiveDay}
        legendData={legendData}
        onCursorChange={onCursorChange}
        titleElement={<PrecipChanceTitle />}
        chartProps={{ scale: {}, domainPadding: { x: 6, y: 5 } }}
      >
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
      </BaseChart>
    );
  }
);

// A chart of forecasted vs observed values with highlighted areas where the forecast was
// inaccurate, or a histogram for precip chance forecasts if type is 'precip_chance'. The
// display includes a TitleStatsDisplay as a title that displays the forecast stats and an
// interactive legend that allows selection of which lead day time forecast to display. When
// the mouse cursor moves over the chart onCursorChange will be passed the nearest data points.
const BaseChart = React.memo(
  function ({
    analysis,
    activeDay,
    setActiveDay,
    legendData,
    onCursorChange,
    titleElement,
    children,
    chartProps = {}
  }) {
    const activeFcasts = getActiveFcasts(analysis, activeDay);

    // Called by the onClick handler of the VictoryLegend.
    const toggleDisplayed = (labelName) => {
      const allFcastDays = Object.keys(analysis.lead_days);
      const [day] = labelName.split('-Day');

      if (!activeDay && labelName.includes('Error')) {
        setActiveDay(activeFcasts[0]);
      } else if ((!activeDay || !activeFcasts.includes(day)) && allFcastDays.includes(day)) {
        setActiveDay(day);
      } else if (['Actual', 'Cumulative'].includes(labelName) || activeFcasts.includes(day)) {
        setActiveDay(null);
      }

      // Reset cursor's nearest data points.
      onCursorChange([]);
    };

    // Setup stats for TitleStatsDiplay
    let stats = !activeDay ? analysis.cumulative_stats : analysis.lead_days[activeDay].stats;

    return (
      <Row className='py-3'>
        <TitleStatsDisplay
          stats={stats}
          units={analysis.metadata.units}
        >
          {titleElement}
        </TitleStatsDisplay>

        <Col xs={12} className='w-100'>
          <VictoryChart
            scale={{ x: 'time' }}
            domainPadding={{ y: 20 }}
            {...chartProps}
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
            <VictoryLegend
              x={20} y={10}
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
                  onClick: (evt, target) => {
                    if (target && target.datum) {
                      toggleDisplayed(target.datum.name);
                    }
                  },
                },
              }]}
            />

            {children}

          </VictoryChart>
        </Col>
      </Row>
    );
  }
);

// Return an array of integers in string form that correspond to the active forecast lead days.
function getActiveFcasts(analysis, activeDay) {
  return activeDay ? [activeDay] : Object.keys(analysis.lead_days);
}

// Generate and return an array of VictoryChart components to be charted.
// ActiveDataDisplay, getLegendData, and the local toggleDisplay in Chart depend on the
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
// important as they are passed to toggleDisplay in the Chart component.
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
            type: (style.legendSymbol && style.legendSymbol.type) || 'circle',
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

function TitleStatsDisplay({ stats, units, children }) {
  return (
    <Col xs={12} className='w-100'>
      <Row className='d-flex justify-content-center'>
        {children}
      </Row>
      <Row className='d-flex justify-content-center'>
          {
            // Get LabeledValue for stats we're interested in.
            [
              ['accuracy', 'accuracy'], 
              ['ave_error', 'error'], 
              ['bias', 'bias']
            ].reduce((compArr, [type, prop]) => {
              if (stats[type] && stats[type][prop] !== undefined) {
                const value = stats[type][prop];
                compArr.push(
                  <LabeledValue className='h5'
                   label={type}
                   value={type === 'accuracy' ? value * 100 : value}
                   units={type === 'accuracy' ? '%' : units}
                   key={prop}
                 />
                );
              }

              return compArr;
            }, [])
          }
      </Row>
    </Col>
  );
}

function ForecastTitle({ activeDay }) {
  return (
    <>
      <h4>
        Forecast Accuracy:
      </h4>,
      <h4 className='ml-2'>
        {activeDay ? `${activeDay}-Day` : 'Cumulative'}
      </h4>
    </>
  );
}

function PrecipChanceTitle() {
  return (
    <>
      <h4>
        Precipitation Chance
      </h4>,
      <h4 className='ml-2'>
        Bin Counts
      </h4>
    </>
  );
}

export default ForecastChart;
