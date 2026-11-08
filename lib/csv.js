'use strict';

exports.csvCell = function csvCell(value) {
  const raw = value == null ? '' : String(value);
  // Prefix spreadsheet formula triggers, including minus, tab and carriage return.
  const safe = /^[\s=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
};

exports.buildCsv = function buildCsv(rows) {
  return '\uFEFF' + rows.map(row => row.map(exports.csvCell).join(',')).join('\r\n');
};
