# متجري (Matjari)

A small e‑commerce storefront with admin panel. RTL/Arabic-first, Algerian wilayas, orders sent to Google Sheets and stock managed in Supabase.

## Stack

- **Frontend:** HTML, CSS, vanilla JS (no framework). `index.html` + `script.js` + `style.css`.
- **Admin:** Single-page app in `admin/index.html` (products, categories, bulk stock, image upload).
- **API:** Vercel serverless functions under `api/`. Auth via JWT in cookie; admin routes use shared guard.
- **Data:** Supabase (PostgreSQL + Storage). Orders forwarded to a Google Apps Script webhook (Sheets).

## Project structure

```
business/
├── README.md           # This file
├── package.json        # Scripts + deps (Supabase, JWT, formidable, etc.)
├── index.html          # Storefront
├── script.js           # Store logic: products, cart, checkout, filters
├── style.css           # Styles
├── products.json       # Optional fallback if API unavailable
├── admin/
│   └── index.html      # Admin SPA (login, products, categories, upload)
├── api/
│   ├── products.js     # GET: public product list (storefront shape)
│   ├── submit-order.js # POST: validate → Google Sheets → 200 (stock in background)
│   ├── _lib/           # Shared code for API routes
│   │   ├── auth.js     # JWT cookie: verifyAdminToken, requireAdmin, makeAuthCookie
│   │   ├── adminGuard.js   # requireAdminAndMethods (DRY guard)
│   │   ├── constants.js   # UUID_REGEX
│   │   ├── catchAsync.js  # Wrap handlers to catch rejections
│   │   ├── guard.js    # allowMethods, login rate limit
│   │   ├── response.js # sendSuccess, sendError
│   │   ├── errors.js   # AppError, notFound, badRequest, etc.
│   │   ├── validate.js # validateProduct, validateCategory
│   │   └── supabase.js # supabaseAdmin (service key)
│   └── admin/
│       ├── login.js    # POST: username + password → Set-Cookie
│       ├── logout.js   # POST: clear cookie
│       ├── verify.js   # GET: { authenticated: true } if valid cookie
│       ├── products.js # GET/POST products
│       ├── products/[id].js  # PUT/DELETE product
│       ├── categories.js     # GET/POST categories
│       ├── categories/[id].js # PUT/DELETE category
│       ├── upload.js   # POST: multipart image → Supabase Storage (bucket auto-created)
│       ├── storage-check.js  # GET: bucket diagnostic
│       └── bulk-stock.js    # POST: bulk inventory update
```

## Environment variables

**Local (`.env.local` in project root):**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (admin + storage) |
| `SUPABASE_ANON_KEY` | Optional; fallback for public client |
| `SUPABASE_STORAGE_BUCKET` | Default: `product-images` |
| `JWT_SECRET` | Secret for admin JWT |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password |
| `GOOGLE_WEBHOOK_URL` | Google Apps Script webhook URL (orders) |

**Vercel:** Add the same variables in the project settings. For production, set `GOOGLE_WEBHOOK_URL` to your deployed Apps Script URL.

## Scripts

```bash
npm run start:dev   # npx vercel dev — local server at http://localhost:3000
npm run deploy      # Deploy to Vercel (production)
```

No build step: static files and serverless functions are used as-is by Vercel.

## Deploy to Vercel

1. **Install Vercel CLI** (if needed): `npm i -g vercel`
2. **From project root:** `vercel` (preview) or `vercel --prod` (production). Or run `npm run deploy`.
3. **Set environment variables** in the [Vercel dashboard](https://vercel.com/dashboard) → your project → Settings → Environment Variables. Add the same vars as in `.env.local` (see table above), especially:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
   - `GOOGLE_WEBHOOK_URL` (your Google Apps Script web app URL for orders)
   - Optionally: `SUPABASE_STORAGE_BUCKET` (default `product-images`)
4. **Redeploy** after changing env vars (Vercel uses them at build/deploy time).

## Supabase setup

1. **Tables:** `products` (id, sku, name_ar, name_en, description_ar, price, inventory, category_id, sizes, images, tags, is_active, is_featured, sort_order, created_at, updated_at), `categories` (id, name_ar, slug, name_en, sort_order). FK: `products.category_id` → `categories.id`.
2. **Storage:** Bucket `product-images` (or name in `SUPABASE_STORAGE_BUCKET`). First upload can auto-create it; on some plans you may need to add a storage policy for the service role.
3. **RPC (optional):** `decrement_inventory(p_id uuid, qty int)` for order stock decrement. If missing, orders still succeed; stock just won’t decrease.

## Google Sheets (orders)

Deploy a Google Apps Script that accepts POST with JSON (e.g. `orderId`, `items`, `customer`, `total`) and appends a row to a sheet. Set the script’s web app URL as `GOOGLE_WEBHOOK_URL`. The storefront sends orders via `api/submit-order` to avoid CORS.

## Code quality notes

- **DRY:** Admin routes use `requireAdminAndMethods(req, res, ...methods)` from `api/_lib/adminGuard.js`. UUID validation uses `UUID_REGEX` from `api/_lib/constants.js`.
- **Comments:** API route files have a short file-level comment; `_lib` modules are documented with JSDoc where useful.
- **Errors:** API errors return JSON `{ error: "..." }` with Arabic messages; `sendError` in `response.js` maps Supabase codes (e.g. 23503) to friendly messages.
