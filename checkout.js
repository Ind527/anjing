/* =====================================================
   checkout.js — pangugreen.com checkout logic
   ===================================================== */
(function () {
  'use strict';

  /* ---- Products catalogue ---- */
  const PRODUCTS = {
    waterproof: {
      id:    'waterproof',
      name:  'Waterproof Coating – Durable, Weatherproof for Indoor & Outdoor Use',
      price: 48.00,
      img:   'https://pangugreen.com/wp-content/uploads/2025/04/f08e4fedd462f328a2bb9b93c7f5cfaf-1.jpg',
    },
    epoxy: {
      id:    'epoxy',
      name:  'Vibrant Epoxy Colored Sand – Durable, Waterproof for Crafts & Decor',
      price: 48.80,
      img:   'https://pangugreen.com/wp-content/uploads/2025/04/dc1c2d52fc46026b9a9f0064dc759d04.jpg',
    },
  };

  /* ---- State ---- */
  let currentProduct = null;
  let qty            = 1;
  let paypalConfig   = {};
  let formValid      = false;

  /* ---- Init ---- */
  async function init() {
    detectProduct();
    renderProduct();
    setupQty();
    setupForm();
    await loadConfig();
    loadPayPalSDK();
  }

  /* ---- Selected variation (color / size from URL params) ---- */
  let selectedColor = '';
  let selectedSize  = '';

  /* ---- Detect product from URL params ---- */
  function detectProduct() {
    const params = new URLSearchParams(window.location.search);
    const pid    = params.get('product') || 'waterproof';
    currentProduct = PRODUCTS[pid] || PRODUCTS.waterproof;
    qty           = Math.max(1, parseInt(params.get('qty') || '1', 10));
    selectedColor = params.get('color') || '';
    selectedSize  = params.get('size')  || '';
  }

  /* ---- Render order summary ---- */
  function renderProduct() {
    const el = document.getElementById('summary-product');
    if (!el || !currentProduct) return;
    const variantBadges = [
      selectedColor ? `<span class="ck-variant-badge">Color: ${escHtml(selectedColor.replace(/-/g,' '))}</span>` : '',
      selectedSize  ? `<span class="ck-variant-badge">Size: ${escHtml(selectedSize)}</span>` : '',
    ].filter(Boolean).join('');

    el.innerHTML = `
      <div class="ck-product-row">
        <img class="ck-product-img" src="${currentProduct.img}" alt="${escHtml(currentProduct.name)}" onerror="this.src='https://pangugreen.com/wp-content/uploads/2025/04/dc1c2d52fc46026b9a9f0064dc759d04.jpg'">
        <div class="ck-product-info">
          <div class="ck-product-name">${escHtml(currentProduct.name)}</div>
          ${variantBadges ? `<div class="ck-variant-badges">${variantBadges}</div>` : ''}
          <div class="ck-product-price">$${currentProduct.price.toFixed(2)} / unit</div>
        </div>
      </div>`;
    updateTotals();
  }

  /* ---- Quantity controls ---- */
  function setupQty() {
    const display = document.getElementById('qty-display');
    const minus   = document.getElementById('qty-minus');
    const plus    = document.getElementById('qty-plus');
    if (!display) return;

    display.textContent = qty;

    minus && minus.addEventListener('click', () => {
      if (qty > 1) { qty--; display.textContent = qty; updateTotals(); }
    });
    plus && plus.addEventListener('click', () => {
      qty++;
      display.textContent = qty;
      updateTotals();
    });
  }

  function updateTotals() {
    if (!currentProduct) return;
    const subtotal = (currentProduct.price * qty).toFixed(2);
    const stEl = document.getElementById('summary-subtotal');
    const ttEl = document.getElementById('summary-total');
    if (stEl) stEl.textContent = '$' + subtotal;
    if (ttEl) ttEl.textContent = '$' + subtotal;
  }

  /* ---- Load config from server ---- */
  async function loadConfig() {
    try {
      const res  = await fetch('/api/config');
      paypalConfig = await res.json();
    } catch (e) {
      console.warn('Could not load config from server — PayPal/EmailJS may be unconfigured.', e);
      paypalConfig = {};
    }
  }

  /* ---- Load PayPal SDK dynamically ---- */
  function loadPayPalSDK() {
    const clientId = paypalConfig.paypalClientId;
    if (!clientId) {
      showPayPalError('PayPal Client ID not configured. Please set PAYPAL_CLIENT_ID environment variable.');
      return;
    }

    const script   = document.createElement('script');
    script.src     = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.onload  = initPayPalButton;
    script.onerror = () => showPayPalError('Failed to load PayPal SDK. Please check your internet connection.');
    document.head.appendChild(script);
  }

  /* ---- Init PayPal button ---- */
  function initPayPalButton() {
    if (typeof paypal === 'undefined') return;

    paypal.Buttons({
      style: {
        layout:  'vertical',
        color:   'gold',
        shape:   'rect',
        label:   'pay',
        height:  45,
      },

      createOrder: async () => {
        showLoading('Creating order…');
        const total = (currentProduct.price * qty).toFixed(2);
        try {
          const res  = await fetch('/api/create-order', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount:      total,
              currency:    'USD',
              description: `${currentProduct.name} × ${qty}`,
            }),
          });
          const data = await res.json();
          hideLoading();
          if (!data.id) throw new Error(data.error || 'Order creation failed.');
          return data.id;
        } catch (err) {
          hideLoading();
          alert('Error creating PayPal order: ' + err.message);
          throw err;
        }
      },

      onApprove: async (data) => {
        showLoading('Processing payment…');
        try {
          const res     = await fetch('/api/capture-order', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID }),
          });
          const capture = await res.json();
          hideLoading();

          if (capture.status !== 'COMPLETED') {
            alert('Payment not completed. Status: ' + capture.status);
            return;
          }

          const txnId     = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || data.orderID;
          const orderData = buildOrderData(txnId, capture);

          localStorage.setItem('ck_last_order', JSON.stringify(orderData));
          await sendEmails(orderData);
          window.location.href = 'success.html?txn=' + encodeURIComponent(txnId);
        } catch (err) {
          hideLoading();
          alert('Payment capture error: ' + err.message);
        }
      },

      onError: (err) => {
        hideLoading();
        console.error('PayPal error:', err);
        alert('PayPal encountered an error. Please try again.');
      },

      onCancel: () => {
        hideLoading();
      },
    }).render('#paypal-button-container');
  }

  /* ---- Build order data object ---- */
  function buildOrderData(txnId, capture) {
    const f     = getFormValues();
    const total = (currentProduct.price * qty).toFixed(2);
    return {
      transactionId:  txnId,
      status:         'COMPLETED',
      date:           new Date().toISOString(),
      customer: {
        fullName:   f.fullName,
        email:      f.email,
        phone:      f.phone,
        company:    f.company,
        country:    f.country,
        address:    f.address,
        city:       f.city,
        state:      f.state,
        zip:        f.zip,
        notes:      f.notes,
      },
      product: {
        id:       currentProduct.id,
        name:     currentProduct.name,
        price:    currentProduct.price.toFixed(2),
        qty:      qty,
        color:    selectedColor || undefined,
        size:     selectedSize  || undefined,
      },
      payment: {
        subtotal: total,
        shipping: 0,
        total:    total,
        currency: 'USD',
        capture:  capture,
      },
    };
  }

  /* ---- Get form values ---- */
  function getFormValues() {
    return {
      fullName: val('ck-full-name'),
      email:    val('ck-email'),
      phone:    val('ck-phone'),
      company:  val('ck-company'),
      country:  val('ck-country'),
      address:  val('ck-address'),
      city:     val('ck-city'),
      state:    val('ck-state'),
      zip:      val('ck-zip'),
      notes:    val('ck-notes'),
    };
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ---- Form validation ---- */
  function setupForm() {
    const btn = document.getElementById('btn-proceed');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (validateForm()) {
        showPayPalSection();
        btn.style.display = 'none';
      }
    });

    /* Live validation — clear error on input */
    document.querySelectorAll('.ck-field input, .ck-field select, .ck-field textarea').forEach(el => {
      el.addEventListener('input', () => clearFieldError(el));
      el.addEventListener('change', () => clearFieldError(el));
    });
  }

  function validateForm() {
    let ok = true;
    const banner = document.getElementById('form-error-banner');

    const rules = [
      { id: 'ck-full-name', msg: 'Full name is required.',           test: v => v.length >= 2 },
      { id: 'ck-email',     msg: 'Valid email address is required.',  test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
      { id: 'ck-phone',     msg: 'Valid phone number is required.',   test: v => /^[+\d\s\-().]{6,20}$/.test(v) },
      { id: 'ck-country',   msg: 'Please select a country.',          test: v => v !== '' },
      { id: 'ck-address',   msg: 'Street address is required.',       test: v => v.length >= 5 },
      { id: 'ck-city',      msg: 'City is required.',                 test: v => v.length >= 2 },
      { id: 'ck-zip',       msg: 'ZIP / Postal code is required.',    test: v => v.length >= 3 },
    ];

    rules.forEach(r => {
      const el = document.getElementById(r.id);
      if (!el) return;
      const v = el.value.trim();
      if (!r.test(v)) {
        setFieldError(el, r.msg);
        ok = false;
      } else {
        clearFieldError(el);
      }
    });

    if (!ok && banner) {
      banner.classList.add('visible');
    } else if (banner) {
      banner.classList.remove('visible');
    }

    return ok;
  }

  function setFieldError(el, msg) {
    const wrapper = el.closest('.ck-field');
    if (!wrapper) return;
    el.classList.add('error');
    wrapper.classList.add('has-error');
    const errEl = wrapper.querySelector('.ck-error-msg');
    if (errEl) errEl.textContent = msg;
  }

  function clearFieldError(el) {
    const wrapper = el.closest('.ck-field');
    if (!wrapper) return;
    el.classList.remove('error');
    wrapper.classList.remove('has-error');
  }

  /* ---- Show/hide PayPal section ---- */
  function showPayPalSection() {
    const sec = document.getElementById('paypal-section');
    if (sec) sec.classList.add('visible');
    sec && sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showPayPalError(msg) {
    const sec = document.getElementById('paypal-section');
    const cnt = document.getElementById('paypal-button-container');
    if (sec) sec.classList.add('visible');
    if (cnt) cnt.innerHTML = `<p style="color:#c0392b;font-family:'Jost',sans-serif;font-size:14px;text-align:center;padding:12px">${escHtml(msg)}</p>`;
  }

  /* ---- Loading overlay ---- */
  function showLoading(msg) {
    const el = document.getElementById('ck-loading');
    const tx = document.getElementById('ck-loading-text');
    if (el) el.classList.add('visible');
    if (tx) tx.textContent = msg || 'Processing…';
  }

  function hideLoading() {
    const el = document.getElementById('ck-loading');
    if (el) el.classList.remove('visible');
  }

  /* ---- EmailJS ---- */
  async function sendEmails(order) {
    const { emailjsPublicKey, emailjsServiceId, emailjsAdminTpl, emailjsCustomerTpl } = paypalConfig;
    if (!emailjsPublicKey || !emailjsServiceId || !emailjsAdminTpl) {
      console.warn('EmailJS not configured — skipping email send.');
      return;
    }

    try {
      if (typeof emailjs === 'undefined') {
        await loadEmailJS(emailjsPublicKey);
      } else {
        emailjs.init({ publicKey: emailjsPublicKey });
      }

      const common = {
        customer_name:    order.customer.fullName,
        customer_email:   order.customer.email,
        customer_phone:   order.customer.phone,
        customer_company: order.customer.company || '—',
        customer_country: order.customer.country,
        shipping_address: `${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.zip}`,
        product_name:     order.product.name,
        product_qty:      order.product.qty,
        product_price:    '$' + order.product.price,
        total_paid:       '$' + order.payment.total,
        transaction_id:   order.transactionId,
        payment_status:   order.payment.capture?.status || 'COMPLETED',
        order_date:       new Date(order.date).toLocaleString(),
        order_notes:      order.customer.notes || '—',
      };

      /* Admin email */
      await emailjs.send(emailjsServiceId, emailjsAdminTpl, {
        ...common,
        to_email: 'admin@pangugreen.com',
        subject:  `New Order — ${order.transactionId}`,
      });

      /* Customer confirmation */
      const custTpl = emailjsCustomerTpl || emailjsAdminTpl;
      await emailjs.send(emailjsServiceId, custTpl, {
        ...common,
        to_email: order.customer.email,
        to_name:  order.customer.fullName,
        subject:  'Your Order Confirmation — pangugreen.com',
      });

    } catch (e) {
      console.error('EmailJS error:', e);
    }
  }

  function loadEmailJS(publicKey) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src   = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = () => { emailjs.init({ publicKey }); resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ---- Helpers ---- */
  function escHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  /* ---- Boot ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
