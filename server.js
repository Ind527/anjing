require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const createOrder  = require('./api/create-order');
const captureOrder = require('./api/capture-order');
const config       = require('./api/config');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ---- API routes ---- */
app.options('/api/create-order',  (_, res) => res.sendStatus(200));
app.options('/api/capture-order', (_, res) => res.sendStatus(200));
app.options('/api/config',        (_, res) => res.sendStatus(200));

app.post('/api/create-order',  createOrder);
app.post('/api/capture-order', captureOrder);
app.get('/api/config',         config);

/* ---- Static files ---- */
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index:      'index.html',
}));

/* ---- Fallback ---- */
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓  pangugreen checkout server running on http://0.0.0.0:${PORT}`);
});
