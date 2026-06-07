---
name: Checkout system architecture
description: PayPal Sandbox + EmailJS checkout for pangugreen.com — server, API routes, and front-end flow
---

## Stack
- **Server**: `server.js` (Express, port 5000) — serves static files + API routes
- **Workflow command**: `npm install --legacy-peer-deps && node server.js`
- **Packages**: express, cors, dotenv, node-fetch (package.json)

## API routes (also Vercel serverless functions)
- `POST /api/create-order` → `api/create-order.js` — creates PayPal Sandbox order
- `POST /api/capture-order` → `api/capture-order.js` — captures approved order
- `GET /api/config` → `api/config.js` — returns public PayPal clientId + EmailJS keys

## Front-end pages
- `checkout.html` + `checkout.css` + `checkout.js` — 2-col form/summary, PayPal SDK loaded dynamically from /api/config clientId
- `success.html` + `success.css` — reads order data from localStorage

## Product URL params
- `checkout.html?product=waterproof` — Waterproof Coating $48.00
- `checkout.html?product=epoxy` — Vibrant Epoxy Colored Sand $48.80
- qty param: `?product=waterproof&qty=3`

## Required environment variables
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (PayPal Sandbox)
- `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_CUSTOMER_TEMPLATE_ID`

**Why:** PayPal client secret must never reach the browser; /api/config only exposes the public clientId.

**How to apply:** When adding new products, add them to the PRODUCTS object in checkout.js.
