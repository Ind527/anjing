module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    paypalClientId:     process.env.PAYPAL_CLIENT_ID     || '',
    emailjsPublicKey:   process.env.EMAILJS_PUBLIC_KEY   || '',
    emailjsServiceId:   process.env.EMAILJS_SERVICE_ID   || '',
    emailjsAdminTpl:    process.env.EMAILJS_TEMPLATE_ID  || '',
    emailjsCustomerTpl: process.env.EMAILJS_CUSTOMER_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || '',
  });
};
