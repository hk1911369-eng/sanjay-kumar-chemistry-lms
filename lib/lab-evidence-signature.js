'use strict';

const { isAllowedImageSignature } = require('./image-signature.js');

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

exports.labEvidenceExtensionForMime = function labEvidenceExtensionForMime(mimeType) {
  return Object.prototype.hasOwnProperty.call(extensions, mimeType) ? extensions[mimeType] : null;
};

exports.isAllowedLabEvidenceSignature = function isAllowedLabEvidenceSignature(mimeType, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 5) return false;
  if (mimeType === 'application/pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  return isAllowedImageSignature(mimeType, bytes);
};
