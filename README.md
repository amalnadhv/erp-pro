# Comrade ERP Pro — SQLite edition

A full ERP web app (React + TypeScript) backed by a **local SQLite database**.
No cloud account, no Supabase project, no service keys — data lives in a file
you can copy and back up.

## Quick start

Requirements: **Node.js 22.13+** (uses the built-in `node:sqlite` module).

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The app logs in automatically as the demo admin:

- Email: `admin@local.test`
- Password: `admin123`

The database is created and seeded on first run at `data/erp.db`.
Uploaded files go to `data/storage/`.

## Production

```bash
npm run build
npm start
```

`npm start` serves `dist/` and the API from one Node process (default port
4173, override with `PORT`). The API is mounted at `/api`.

See **[DEPLOY.md](DEPLOY.md)** for free hosting options (Vercel, Render,
Railway, Fly.io, Oracle Cloud Always Free), persistent volumes, and moving to
WAMP/MySQL later.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server + local API at `/api` |
| `npm run build` | Build the UI into `dist/` |
| `npm start` | Serve `dist/` + API (production) |
| `npm run db:reset` | Delete `data/` so the next start re-seeds |
| `npm run db:schema` | Regenerate the SQLite schema from `supabase/*.sql` |

## Architecture

```
src/                 React UI (single-page app)
src/utils/supabaseClient.ts   ← the single data seam
src/utils/localClient.ts      Supabase-compatible client → /api
server/db.mjs        SQLite open + schema + demo seed
server/api.mjs       query/auth/storage/rpc translation to SQLite
server/start.mjs     production Node server (static + API)
server/vite-plugin.mjs  mounts the API in the Vite dev server
server/schema.sqlite.sql  generated from supabase/*.sql
data/erp.db          your data (git-ignored)
```

The UI was written against the Supabase client API. `localClient.ts` implements
the same methods (`from().select().eq()...`, `auth.*`, `storage.*`,
`functions.invoke`, `rpc`) and forwards them to the local Node API, so most
components did not need to change.

### What runs locally

- **Auth:** users in `erp_users` with scrypt password hashes. One demo user is
  seeded; there is no email confirmation and no multi-tenant row-level security.
- **Storage:** uploads are written under `data/storage/` and served from
  `/api/storage/file/<bucket>/<path>`.
- **Email / ZATCA / bank feed:** stubbed. Emails are appended to
  `data/outbox.log`; e-invoicing and bank-feed calls return simulated results.
- **RPC:** `get_tax_config` and `generate_recurring_invoice` are implemented;
  other Postgres functions return a clear “not implemented” error.

## Security

This is a local/self-hosted build. Before exposing it to the internet:

- change the demo password or add real user management,
- put it behind HTTPS and a reverse proxy,
- restrict who can reach `/api`,
- keep `data/` out of version control (already ignored).

## License

MIT
