---
name: neutralizeLink allowed list
description: Every new page URL must be added to the allowed array in ALL existing pages or its links get blocked by the export neutralizer script. Also covers hover-img and javascript:void(0) link blackhole behavior.
---

## Rule
The site uses a `neutralizeLink` script (NoCodeExport pattern) that intercepts clicks and blocks navigation to any URL NOT in the `allowed` array.

**Why:** This is a WordPress static export. Links to pages not in the allowed list are converted to `javascript:void(0)` and blocked.

**How to apply:** Whenever a new `.html` page is added, add its URL to the `allowed` array in ALL HTML files.

## Critical: each page has its own hardcoded origin
- `index.html` / `product.html` → `origin = "https://pangugreen.com"` → use `"https://pangugreen.com/newpage.html"`
- `blog.html` → `origin = "https://blog-mu-three-96.vercel.app"` → use `"https://blog-mu-three-96.vercel.app/newpage.html"`
- `about.html` → `origin = "https://ketawa.vercel.app"` → use `"https://ketawa.vercel.app/newpage.html"`
- `contact.html` → `origin = "https://contact-kappa-three.vercel.app"` → use `"https://contact-kappa-three.vercel.app/newpage.html"`

**Links are resolved against the page's hardcoded `origin`, NOT `window.location.origin`.** So `./blog.html` on `blog.html` resolves to `https://blog-mu-three-96.vercel.app/blog.html` — that must be in the allowed array.

## buildExportHref must handle flat .html files
The original `buildExportHref` only handles WordPress-style paths (`/about-us/` → `./about-us/index.html`). For flat `.html` files it returns wrong paths like `./about.html/index.html`.

**Fix (already applied to all pages):**
```javascript
var targetPath;
if (clean === "/") {
    targetPath = "index.html";
} else if (/\.html$/i.test(clean)) {
    targetPath = clean.substring(1);
} else {
    targetPath = clean.substring(1) + "/index.html";
}
return relativeRoot + targetPath + (url.hash || "");
```
`index.html` and `product.html` already had this fix; `blog.html`, `about.html`, `contact.html` needed it added.

## The javascript:void(0) blackhole — critical gotcha
The neutralizeLink IIFE also registers a **capturing-phase** document click listener that calls `e.stopImmediatePropagation()` on ANY link whose href contains `javascript:void(0)`. This kills ALL other capturing handlers registered after it, including custom card-click navigation handlers.

**Consequence:** Hover images (`.hover-img a`) always start as `href="javascript:void(0)"` in the WordPress export. If not fixed, clicking the hover image silently kills all navigation handlers — even ones that should handle the whole card.

**Fix required for every new product card:**
1. Add destination page to `allowed` array in all files
2. Set correct `href` + `onclick="window.location.href='dest'; return false;"` on:
   - `.product-image-link` (main image)
   - `.hover-img a` (hover image) — THIS IS THE KEY ONE
   - Title link in `.wd-entities-title`
   - "Select options" button
3. Remove `wd-quick-shop` class from `.product-element-top` in HTML source
4. Add product ID → dest mapping to the URLS object in the inline `<script>` block
5. Add product ID to `ALL_IDS` array and to `bindCardClicks()` selector

## Current allowed pages (as of June 2026)
All main pages include: `/`, `/product.html`, `/about.html`, `/contact.html`, `/blog.html`, `/vibrant-epoxy-colored-sand-durable-waterproof-for-crafts-decor.html`, `/waterproof-coating-durable-weatherproof-for-indoor-outdoor-use.html`, `/checkout.html`, `/success.html`, `/html1.html`, `/html2.html`, `/html3.html`

## Product ID → page mapping (as of June 2026)
- 9988 → vibrant-epoxy-colored-sand-durable-waterproof-for-crafts-decor.html
- 10028 → waterproof-coating-durable-weatherproof-for-indoor-outdoor-use.html
- 9913 → html1.html (High-Gloss Floor Lacquer)
- 10168 → html2.html (Waterproof Glue)
- 10117 → html3.html (Metallic Paint)
- 10320 → html3.html (Tile Paint)
