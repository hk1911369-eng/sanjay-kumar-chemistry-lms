'use strict';

exports.isValidAttendanceDate = function isValidAttendanceDate(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) return false;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const todayInDhaka = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = `${todayInDhaka.year}-${todayInDhaka.month}-${todayInDhaka.day}`;
  return value <= today;
};
