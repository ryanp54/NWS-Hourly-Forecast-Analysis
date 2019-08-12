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

export function getISO(date) {
	return date.toISOString().split('T')[0];
}