# FlatMate — Shared Expense Tracker

A Splitwise-inspired app for flat-mates to track shared expenses, with full CSV import, multi-currency support, and time-aware membership.

**AI tool used:** Claude (Anthropic) — see [AI_USAGE.md](./AI_USAGE.md)

---

## Live App

> Add your deployed URL here after deployment.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite, Axios, socket.io |
| Backend  | Node.js 20, Express 4, socket.io  |
| Database | PostgreSQL 15 (Neon / Supabase)   |
| Auth     | JWT (bcryptjs)                    |
| Upload   | multer (memory storage)           |

---

## Prerequisites

- Node.js ≥ 20
- A PostgreSQL 15 database (local or [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- `npm` or `yarn`

---

## Setup

### 1. Clone

```bash
git clone <your-repo-url>
cd splitwise-app
```

### 2. Database

Run all three SQL files **in order** against your PostgreSQL database:

```bash
psql $DATABASE_URL -f backend/db/schema.sql
psql $DATABASE_URL -f backend/db/schema_additions.sql
psql $DATABASE_URL -f backend/db/schema_migration_v2.sql
```

`schema_migration_v2.sql` adds:
- `expense_date`, `original_currency`, `original_amount`, `fx_rate` columns on `expenses`
- `left_at` column on `group_members`
- `import_sessions`, `import_anomalies`, `import_pending_rows` tables

### 3. Backend

```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run dev               # http://localhost:4000
```

**Required `.env` values:**

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_ACCESS_SECRET=your_random_secret_here
JWT_ACCESS_EXPIRY=7d
PORT=4000
CLIENT_URL=http://localhost:5173
```

Install the one new dependency (multer for file uploads):

```bash
npm install multer
```

Then register the import route in `src/app.js`:

```js
import importRoutes from './routes/import.routes.js';
// ...
app.use('/api/import', importRoutes);
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`.

Add to `vite.config.js` if not already present:

```js
server: {
  proxy: {
    '/api': 'http://localhost:4000',
  },
},
```

---

## Importing the CSV

1. Log in and open (or create) a group containing the flat-mates.
2. Click **Import CSV** in the group header.
3. Upload `expenses_export.csv`.
4. Review the anomaly report — rows flagged **Needs Review** require your decision before being saved.
5. Approve or reject each flagged row inline.

The importer never silently guesses and never crashes. See [SCOPE.md](./SCOPE.md) for the full anomaly log.

---

## Deployment

### Backend (Railway / Render / Fly.io)

Set the same `.env` variables in your hosting dashboard. The `start` script is `node src/server.js`.

### Frontend (Vercel / Netlify)

Set `VITE_API_BASE_URL` if you're not using a proxy. Update `src/api/client.js` `baseURL` accordingly.

---
