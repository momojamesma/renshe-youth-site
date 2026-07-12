# Cloudflare Deployment

This project uses Cloudflare as the primary deployment path:

- Static assets: Cloudflare Assets
- API runtime: Cloudflare Workers
- Persistent storage: Cloudflare D1

## Why this move

- Cloudflare Workers avoids the long cold-start behavior common on some free web hosts.
- The public site, admin dashboard, and API can run on one free stack.
- D1 keeps the editable site data and admin accounts persistent.

## Files added

- [worker.mjs](C:/Users/momo1/Documents/專案/第一次使用/worker.mjs)
- [wrangler.toml](C:/Users/momo1/Documents/專案/第一次使用/wrangler.toml)
- [cloudflare/schema.sql](C:/Users/momo1/Documents/專案/第一次使用/cloudflare/schema.sql)
- [scripts/prepare-cloudflare-assets.mjs](C:/Users/momo1/Documents/專案/第一次使用/scripts/prepare-cloudflare-assets.mjs)

## One-time setup

0. If this computer does not have global `npm`, use the included local wrapper:
   `.\npm.cmd install --ignore-scripts`
1. Create a D1 database:
   `node node_modules/wrangler/bin/wrangler.js d1 create renshe-youth-site`
2. Copy the returned `database_id` into [wrangler.toml](C:/Users/momo1/Documents/專案/第一次使用/wrangler.toml).
3. Optional but recommended: set a session secret:
   `node node_modules/wrangler/bin/wrangler.js secret put SESSION_SECRET`
4. Optional if you use production ECPay credentials:
   `node node_modules/wrangler/bin/wrangler.js secret put ECPAY_MERCHANT_ID`
   `node node_modules/wrangler/bin/wrangler.js secret put ECPAY_HASH_KEY`
   `node node_modules/wrangler/bin/wrangler.js secret put ECPAY_HASH_IV`

## Deploy

1. Build the Cloudflare asset bundle:
   `.\npm.cmd run cf:build`
2. Deploy:
   `.\npm.cmd run cf:deploy`

After deploy, Cloudflare will provide a `workers.dev` URL such as:

`https://renshe-youth-site.<your-subdomain>.workers.dev`

## Notes

- The first deploy seeds D1 from the current local `data/site-data.json` and `data/admins.json`.
- The primary admin account remains:
  - Username: `renshe_admin`
  - Password: `RensheYouth!ed60806a73`
- The Worker version protects `/api/site-data` behind login instead of leaving full site data public.
