'use strict';

exports.csvCell = function csvCell(value) {
  const raw = value == null ? '' : String(value);
  // Prefix spreadsheet formula triggers and any leading whitespace.
  const safe = /^[\s=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
};

exports.buildCsv = function buildCsv(rows) {
  return '\uFEFF' + rows.map(row => row.map(exports.csvCell).join(',')).join('\r\n');
};
