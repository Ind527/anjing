---
name: neutralizeLink allowed list
description: Every new page URL must be added to the allowed array in ALL existing pages or its links get blocked by the export neutralizer script.
---

## Rule
The site uses a `neutralizeLink` script (NoCodeExport pattern) that intercepts clicks and blocks navigation to any URL NOT in the `allowed` array.

**Why:** This is a WordPress static export. Links to pages not in the allowed list are converted to `javascript:void(0)` and blocked.

**How to apply:** Whenever a new `.html` page is added, add `"https://pangugreen.com/newpage.html"` to the `allowed` array in:
- `index.html`
- `product.html`
- `about.html`
- `contact.html`
- (and any other page that might link to the new page)

## Current allowed pages (as of June 2026)
All main pages include: `/`, `/product.html`, `/about.html`, `/contact.html`, `/vibrant-epoxy-colored-sand-durable-waterproof-for-crafts-decor.html`, `/waterproof-coating-durable-weatherproof-for-indoor-outdoor-use.html`, `/checkout.html`, `/success.html`

## Product detail pages
`waterproof-coating-durable-weatherproof-for-indoor-outdoor-use.html` and `vibrant-epoxy-colored-sand-durable-waterproof-for-crafts-decor.html` have their own separate minimal `allowed` arrays — update if adding links there too.
