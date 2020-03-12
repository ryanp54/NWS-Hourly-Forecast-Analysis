import React from 'react';

import { toTitleCase } from './helpers'

// Display text in the form label: value units. className is appended to the containing span's
// className and is optional.
export default function LabeledValue({
  label, value, units, type, className,
}) {
  const formattedValue = `${Math.round(value * 10) / 10} ${units}`;

  return (
    <span className={`mr-3 d-inline-block ${className}`}>
      <span> {toTitleCase(label)}: </span>
      <span className='font-weight-light ml-2'> {formattedValue} </span>
    </span>
  );
}
