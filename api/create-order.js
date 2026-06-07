const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured in environment variables.');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { amount, currency = 'USD', description } = req.body || {};

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: parseFloat(amount).toFixed(2),
          },
          description: description || 'pangugreen.com Order',
        }],
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text();
      throw new Error(`PayPal create order failed: ${text}`);
    }

    const order = await orderRes.json();
    return res.status(200).json(order);
  } catch (err) {
    console.error('[create-order]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
