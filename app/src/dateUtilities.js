export function getLastMonthStart() {
	const date = new Date();
	date.setMonth(date.getMonth() - 1);
	date.setDate(1);
	return date;
}

export function getLastMonthEnd() {
	const date = new Date();
	date.setDate(0);
	return new Date(Math.min(date.valueOf(), getDaysAgo(2).valueOf()));
}

export function getDaysAgo(days) {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date;
}

export function getISODate(date) {
	return date.toISOString().split('T')[0];
}

export function getISORoundHour(date) {
	const dateCopy = new Date(date);
	if (date.getMinutes() >= 30) {
		dateCopy.setHours(date.getHours() + 1);
	}
	const hours = dateCopy.toISOString().split('T')[1].split(':')[0];
	return `${getISODate(date)}T${hours}:00`;
}

export function parseToUTC(iso) {
	const date = new Date(iso);
	return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()));
}