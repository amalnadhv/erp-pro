# Deploying ERP Pro (SQLite edition)

This app is a **React UI + a small Node API + a SQLite file** (`data/erp.db`).
It is not a static site: the API needs a Node process and a writable folder.

Node **22.13+** is required (the server uses the built-in `node:sqlite` module).
`npm start` builds nothing — run `npm run build` first, or use a host that does it for you.

| Host | Cost | Persistent data | Best for |
|---|---|---|---|
| **Vercel** | Free | ❌ `/tmp` only, resets on cold start | Public demo |
| **Render** (free web service) | Free | ❌ resets on restart | Demo / staging |
| **Render + disk**, Railway + volume, Fly + volume | Low cost | ✅ | Small production |
| **Oracle Cloud Always Free VM** | Free | ✅ | Free production |
| **WAMP / Windows PC** | Free | ✅ | Office / LAN |
| **Turso + Vercel** | Free tier | ✅ (cloud SQLite) | Needs a code change, see below |

> **Why not plain Vercel with a SQLite file?**
> Vercel runs each request in an ephemeral serverless instance. The only writable
> path is `/tmp`, and it disappears. The app still runs and auto-seeds demo data,
> but changes are not durable and instances do not share data. Use Vercel for a
> demo, or move the DB to a hosted service (Turso/Neon) for real use.

---

## Option A — Vercel (free demo)

The repo already contains `vercel.json`, `api/index.mjs` and `api/[...path].mjs`.

1. Push the repo to GitHub (see **GitHub** below).
2. Go to <https://vercel.com/new>, import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
4. Deploy. No environment variables are needed.
5. Open `https://<project>.vercel.app` — it auto-logs in with the demo admin
   (`admin@local.test` / `admin123`) and seeds the database in `/tmp`.

**Caveats**
- Every cold start / new instance re-seeds the demo data. Edits can disappear.
- Uploaded attachments are written to `/tmp` and are lost.
- Do not use this for real business data.

For durable data on Vercel, replace `server/db.mjs` with a hosted SQLite driver
such as **Turso** (`@libsql/client`) or switch to Postgres/Neon. The API is
isolated in `server/api.mjs`, so that is a contained change.

---

## Option B — Render free web service (same code, no Docker)

`render.yaml` is included.

1. Push to GitHub.
2. <https://dashboard.render.com> → **New → Blueprint** → pick the repo.
3. Render reads `render.yaml`, runs `npm ci && npm run build`, then `npm start`.
4. Open the service URL. Health check: `/api/health`.

The free plan has no persistent disk, so data resets on restart/spindown.
Auto-seed makes it look populated again.

### Persistence on Render

Add a **Disk** (paid) mounted at `/var/data`, then set:

```
ERP_DATA_DIR=/var/data
```

`erp.db` and `storage/` then survive deploys and restarts.

---

## Option C — Railway / Fly.io / Docker (persistent volume)

Railway (`railway.json` included) or any Docker host:

```bash
# Build and run with a named volume
docker build -t erp-pro .
docker run -d -p 4173:4173 \
  -v erp-data:/data \
  -e ERP_DATA_DIR=/data \
  --name erp-pro erp-pro
```

Open <http://localhost:4173>. Back up the volume or copy `/data/erp.db`.

On Railway: create a service from the repo, add a volume mounted at `/data`,
set `ERP_DATA_DIR=/data`. `railway.json` already sets the start command.

On Fly.io: `fly launch`, then `fly volumes create erp_data --size 1`, mount it at
`/data`, set `ERP_DATA_DIR=/data`, and expose port 4173.

---

## Option D — Oracle Cloud Always Free VM (free + persistent, recommended)

This keeps the exact SQLite setup with a real disk.

1. Create an **Always Free** Ubuntu VM (Ampere or AMD).
2. Open port 80/443 in the VCN security list.
3. Install Node 24 and Caddy:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs git caddy
git clone https://github.com/<you>/erp-pro.git
cd erp-pro
npm ci
npm run build
```

4. Run it as a service:

```bash
sudo tee /etc/systemd/system/erp.service >/dev/null <<'EOF'
[Unit]
Description=ERP Pro
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/erp-pro
ExecStart=/usr/bin/node server/start.mjs
Environment=PORT=4173
Environment=ERP_DATA_DIR=/home/ubuntu/erp-pro/data
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now erp
```

5. Put Caddy in front for HTTPS:

```
# /etc/caddy/Caddyfile
your-domain.com {
    reverse_proxy 127.0.0.1:4173
}
```

```bash
sudo systemctl reload caddy
```

No domain yet? Use the VM's public IP on port 4173, or a free `nip.io` hostname.

---

## Option E — WAMP / Windows later

WAMP is Apache + MySQL + PHP. This app's backend is Node, so you have two choices:

1. **Keep the Node API (easiest, no rewrite).** Install Node 22.13+ on the
   Windows machine, run `npm ci && npm run build`, then `npm start`
   (`ERP_DATA_DIR=C:\erp-data`). Use Apache/WAMP as a reverse proxy to
   `http://127.0.0.1:4173`, or just expose port 4173 on the LAN.
   Run it as a Windows service with [NSSM](https://nssm.cc/).
2. **Rewrite the backend for PHP + MySQL.** The UI only talks to `/api`, and the
   data layer lives in `server/db.mjs` + `server/api.mjs`. Port those two files to
   PHP endpoints and replace `src/utils/localClient.ts`'s `post()` target.
   The current SQLite schema (`server/schema.sqlite.sql`) maps closely to MySQL.

Copy `data/erp.db` and `data/storage/` to move existing data.

---

## Data, backup and reset

| What | Where |
|---|---|
| Database | `data/erp.db` (plus `-wal`/`-shm` while running) |
| Uploads | `data/storage/<bucket>/...` |
| Emails (local mode) | `data/outbox.log` |

- **Backup:** stop the server, copy the whole `data/` folder (or at least `erp.db`).
- **Reset demo data:** `npm run db:reset`, then restart. It re-seeds on next start.
- **Regenerate schema:** `npm run db:schema` (converts `supabase/*.sql`).

## Security notes before real use

- Change the demo admin password (`admin@local.test` / `admin123`).
- The local API has no row-level security or multi-tenant isolation. Run it on a
  trusted network or behind HTTPS and a reverse proxy.
- Keep `data/` out of git (already in `.gitignore`).
- Set a strong password and restrict uploads to trusted users.

---

## GitHub

The project is a normal Node repo. From this folder:

```bash
git init
git add .
git commit -m "Migrate to local SQLite backend and add deployment config"
git branch -M main
git remote add origin https://github.com/<you>/erp-pro.git
git push -u origin main
```

To keep the original history, clone the repo first and copy these changes into
the clone, then push a branch and open a pull request:

```bash
git clone https://github.com/<you>/erp-pro.git erp-pro-git
# copy changed files into erp-pro-git, then:
cd erp-pro-git
git checkout -b sqlite-local
git add .
git commit -m "Add local SQLite backend"
git push -u origin sqlite-local
```

Never commit `data/`, `.env`, `node_modules/` or `dist/` (they are ignored).
