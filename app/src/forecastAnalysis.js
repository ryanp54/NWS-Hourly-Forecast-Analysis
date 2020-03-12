import React, { useState, useEffect, useCallback } from 'react';

import {
  Container,
  Row,
  Col,
  Tabs,
  Tab,
} from 'react-bootstrap';

import { ForecastChart, PrecipChanceChart } from './charts';
import LabeledValue from './LabeledValue';
import { toTitleCase } from './helpers';

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
  // Annalysis for all forecast lead-days will be displayed when activeDay is falsey.
  const [activeDay, setActiveDay] = useState(null);

  // Memomize callback so memoized children it's passed to don't render unnecessarily.
  const handleChange = useCallback(setActiveData, []);

  // Make sure activeData gets reset when chart switches.
  useEffect(() => setActiveData([]), [analysis]);

  const displayInfo = { ...analysis.metadata };
  // Setup proper units formatting for ActiveDataDisplay.
  let units = displayInfo.units
  if (!units || Object.getPrototypeOf(units) !== Object.prototype) {
    displayInfo.units = {
      x: units,
      y: units
    };
  }

  let chart;
  if (displayInfo.prop_name === 'precip_chance') {
    // Mutate for data structures difference from other weather types and switch chart to
    // PrecipChanceChart.
    [analysis.cumulative_stats, ...Object.values(analysis.lead_days)].forEach((stats) => {
      if (stats.stats) {
        stats.stats.bias = stats.stats.bin_count;
      } else {
        stats.bias = stats.bin_count;
      }
    });
    displayInfo.units.y = '';

    chart = (
      <PrecipChanceChart
        analysis={analysis}
        onCursorChange={handleChange}
        activeDay={activeDay}
        setActiveDay={setActiveDay}
      />
    );
  } else {
    chart = (
      <ForecastChart
        analysis={analysis}
        onCursorChange={handleChange}
        activeDay={activeDay}
        setActiveDay={setActiveDay}
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
            style={{ minHeight: '75px'}}
          >
            <ActiveDataDisplay
              displayInfo={displayInfo}
              data={activeData}
              type={displayInfo.prop_name}
            />
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


// Display active data points. displayInfo be a string or object with x and y attributes of the
// units to be used with the data points and data should be a list of the datum objects.
function ActiveDataDisplay({ displayInfo, data, type }) {
  if (!data || data.length === 0) {
    return '';
  }

  const { units } = displayInfo;

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
