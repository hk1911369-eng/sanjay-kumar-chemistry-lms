'use strict';
exports.paymentReviewErrorCode = function paymentReviewErrorCode(error) {
  if (error?.code === '42501') return 'forbidden';
  if (error?.code === 'P0002') return 'not_found';
  if (error?.code === '23505') return 'duplicate';
  return 'failed';
};
