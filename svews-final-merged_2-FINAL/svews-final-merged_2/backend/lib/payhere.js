// lib/payhere.js — NEW FILE. Shared PayHere sandbox helpers.
// Used by routes/payments.js (order payments) and routes/registrationFee.js
// (mandatory registration fee) so the signature logic lives in one place.

const crypto = require('crypto');

const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const PAYHERE_CHECKOUT_URL = process.env.PAYHERE_MODE === 'live'
  ? 'https://www.payhere.lk/pay/checkout'
  : 'https://sandbox.payhere.lk/pay/checkout';

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// The hash PayHere requires on every checkout request, proving it came
// from your server (which alone knows the merchant secret).
function buildCheckoutHash(orderId, amount) {
  const amountFormatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, useGrouping: false });
  const secretHash = md5(PAYHERE_MERCHANT_SECRET).toUpperCase();
  return md5(`${PAYHERE_MERCHANT_ID}${orderId}${amountFormatted}LKR${secretHash}`).toUpperCase();
}

// Verifies the signature PayHere sends back on its notify webhook.
function verifyNotifySignature({ merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig }) {
  const secretHash = md5(PAYHERE_MERCHANT_SECRET).toUpperCase();
  const localSig = md5(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`).toUpperCase();
  return localSig === md5sig;
}

function isConfigured() {
  return Boolean(PAYHERE_MERCHANT_ID && PAYHERE_MERCHANT_SECRET);
}

module.exports = {
  PAYHERE_MERCHANT_ID, PAYHERE_CHECKOUT_URL,
  buildCheckoutHash, verifyNotifySignature, isConfigured,
};
