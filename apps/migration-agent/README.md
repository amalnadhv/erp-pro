# Migration agent

Customer-side converter for legacy Microsoft SQL Server data. It runs on a
machine inside the customer's network, reads the source with keyset pages and
sends normalized batches to the SaaS over outbound HTTPS. The SaaS never dials
into the customer's network.

## Status

Milestone 1: discovery + raw NDJSON export. Batched upload to the SaaS ingestion
API is the next milestone (see contract below).

## Setup

```powershell
cd apps/migration-agent
npm install
```

Configure with environment variables (the same names the server uses):

| Variable | Example | Notes |
| --- | --- | --- |
| `MSSQL_HOST` | `sreeji` | host or `host\INSTANCE` |
| `MSSQL_PORT` | `1475` | ignored when an instance is given |
| `MSSQL_DATABASE` | `COM_BARAB` | one database per legacy company |
| `MSSQL_USER` | `sa` (prefer a read-only login) | |
| `MSSQL_PASSWORD` | | entered locally, never uploaded |
| `MSSQL_INSTANCE` | `SQ2022` | optional |
| `MSSQL_ENCRYPT` | `false` | |
| `MSSQL_TRUST_CERT` | `true` | |

## Commands

```powershell
node src/index.mjs databases
node src/index.mjs discover
node src/index.mjs dump --table asmast --limit 100 --out ../../.migration/asmast.ndjson
node src/index.mjs dump --table asicm --out ../../.migration/asicm.ndjson
```

- `discover` lists the legacy tables (Comrade: `asmast`, `asicm`, `asinv`,
  `aspinv`, `astran`, `asict`, `ASADR`, `ASVOUCHMAST`) with row counts, columns
  and keys.
- `dump` exports any table to NDJSON using `TOP` + keyset paging (no
  `OFFSET/FETCH`), so it works on older SQL Server versions and never loads the
  whole table into memory. The primary key is used by default; pass `--key` for
  tables without one.
- `--limit` stops after N rows, useful for a dry run.
- Progress is written to stderr; data goes to `--out` or stdout.

## Ingestion contract (next)

The agent will call the SaaS with a short-lived migration token:

```
POST {SAAS_URL}/api/migration/sessions
  { "source": "comrade", "database": "COM_BARAB", "mode": "balances|full" }
  -> { "session_id": "...", "entities": [...] }

POST {SAAS_URL}/api/migration/sessions/{id}/batches
  Authorization: Bearer <MIGRATION_TOKEN>
  { "entity": "accounts", "batch": 12, "rows": [...], "checksum": "sha256:..." }
  -> { "accepted": 12, "idempotent": false }

POST {SAAS_URL}/api/migration/sessions/{id}/complete
  -> { "status": "validated", "report": [...] }
```

Rules the SaaS side must enforce:

- `(session_id, entity, batch)` is idempotent, so retries and resumes are safe.
- Batches land in staging, never directly in tenant tables.
- Validation compares counts, trial balance, A/R and A/P aging and stock totals
  before a separate promote step makes the data live.
- Checkpoints live in `.migration/state.json` so an interrupted run resumes at
  the last accepted batch.

## Security

- Outbound HTTPS only; no inbound ports or VPN.
- Source credentials stay on the agent machine.
- Use a least-privilege read-only SQL login, not `sa`.
- The migration token is scoped to one tenant and one session and expires.
