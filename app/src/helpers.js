// Convert snake case to title case.
export function toTitleCase(str) {
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

export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return date;
}

// Return month/day if time is midnight, otherwise return the time (hh:mm).
export function getMidnightDateOrTime(dateTime) {
  const date = `${dateTime.getMonth() + 1}/${dateTime.getDate()}`;
  const time = dateTime.toLocaleTimeString().split(/[:\s]/);

  return dateTime.getHours() ? `${time[0]} ${time.slice(-1)}` : date;
}

// Return an instance of Date of the first day of the previous month. Year is ignored.
export function getLastMonthStart() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(1);

  return date;
}

// Return iso formatted date without time info.
export function getISODate(date) {
  return date.toISOString().split('T')[0];
}

export function getISOHourRounded(date) {
  const dateCopy = new Date(date);
  if (date.getMinutes() >= 30) {
    dateCopy.setHours(date.getHours() + 1);
  }
  const [hours] = dateCopy.toISOString().split('T')[1].split(':');

  return `${getISODate(date)}T${hours}:00`;
}

// Instantiate a Date, but with the tiemzone set to GMT instead of the local one.
export function parseToUTC(iso) {
  const date = new Date(iso);

  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()));
}

// Simple deep merge solution from user y.c. on stackoverflow: https://stackoverflow.com/a/50228121
// TODO: not used? remove?
export function merge(current, update) {
  Object.keys(update).forEach((key) => {
    // if update[key] exist, and it's not a string or array,
    // we go in one level deeper
    if (
      Object.prototype.hasOwnProperty.call(current, key)
      && typeof current[key] === 'object'
      && !(current[key] instanceof Array)
    ) {
      merge(current[key], update[key]);

    // if update[key] doesn't exist in current, or it's a string
    // or array, then assign/overwrite current[key] to update[key]
    } else {
      current[key] = update[key];
    }
  });

  return current;
}