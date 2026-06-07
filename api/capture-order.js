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
    const { orderID } = req.body || {};

    if (!orderID) {
      return res.status(400).json({ error: 'orderID is required.' });
    }

    const accessToken = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      const text = await captureRes.text();
      throw new Error(`PayPal capture failed: ${text}`);
    }

    const capture = await captureRes.json();
    return res.status(200).json(capture);
  } catch (err) {
    console.error('[capture-order]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
