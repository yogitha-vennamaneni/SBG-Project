# SBG Scheduler — Solar Battery Group

A full-stack job management and scheduling platform for Solar Battery Group, built as a technical interview project.

Covers the complete solar/battery installation workflow: customer enquiry → quote → e-signature acceptance → job creation → technician scheduling → site visit → invoice/payment → safety certificates.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Material UI v5 |
| **Routing** | React Router v6 |
| **Calendar** | react-big-calendar (drag-and-drop scheduler) |
| **Forms** | React Hook Form + Zod validation |
| **Photos** | React Dropzone (upload UI) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Neon (serverless PostgreSQL 16) |
| **Storage** | Google Cloud Storage (signed URLs) |
| **Auth** | Auth0 (RS256 / JWKS) |
| **E-signature** | DocuSeal (open-source, self-hosted) — HMAC webhook verification |
| **Payments** | Stripe — Payment Intents, webhook verification |
| **Email** | Resend — transactional email |
| **PDF** | pdf-lib — Quote, Invoice, CES, STC Assignment |
| **Weather** | OpenWeatherMap 5-day forecast (mock fallback) |
| **Testing** | Vitest + Testing Library (frontend), Jest + Supertest (backend) |

---

## Project Structure

```
sbg-scheduler/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Layout, PhotoUploadPanel
│   │   ├── data/             # sampleData.ts (demo fixtures)
│   │   ├── pages/            # Dashboard, Enquiries, Scheduler, Jobs, Quotes, Customers, Technicians
│   │   ├── services/         # api.ts (Axios client)
│   │   ├── theme/            # MUI theme (SBG brand colours)
│   │   ├── types/            # Shared TypeScript types
│   │   └── __tests__/        # Vitest unit tests
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                   # Express API server
│   ├── src/
│   │   ├── routes/           # enquiries, quotes, jobs, technicians, invoices, certificates, webhooks
│   │   ├── services/         # stcService, weatherService, pdfService
│   │   └── __tests__/        # Jest unit + integration tests
│   ├── tsconfig.json
│   └── package.json
│
└── database/
    ├── migrations/
    │   └── 001_initial.sql   # Full schema (run first)
    └── seed.sql              # Demo data (run second)
```

---

## Quick Start

### 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech) (Postgres 16)
2. From the dashboard, copy the **pooled** connection string into `DATABASE_URL`
3. Run the schema and demo data against it:
   ```bash
   psql "$DATABASE_URL" -f database/migrations/001_initial.sql
   psql "$DATABASE_URL" -f database/seed.sql
   ```

### 2. Storage (Google Cloud Storage)

1. Create a GCS bucket (e.g. `sbg-scheduler-uploads`) and a service account with **Storage Object Admin** on it
2. Download the service account key JSON and point `GOOGLE_APPLICATION_CREDENTIALS` at it
3. Set `GCS_BUCKET_NAME` / `GCS_PROJECT_ID` in the server `.env`

### 3. Auth (Auth0)

1. Create an Auth0 **API** (Applications → APIs) — this gives you the `AUTH0_AUDIENCE` identifier
2. Create an Auth0 **Application** (SPA) for the React client and configure its allowed callback/logout URLs for `http://localhost:5173`
3. Set `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` in the server `.env`

### 4. Server

```bash
cd server
cp .env.example .env          # Fill in your keys
npm install
npm run dev                   # ts-node-dev on :3001
```

### 5. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev                   # Vite on :5173
```

Open [http://localhost:5173](http://localhost:5173)

---

## Running Tests

### Frontend (Vitest)

```bash
cd client
npm test              # run once
npm run test:ui       # Vitest UI
npm run coverage      # coverage report
```

Test files:
- `src/__tests__/stcCalc.test.ts` — STC calculation + zone mapping
- `src/__tests__/jobAssignment.test.ts` — scheduling overlap, availability, skills

### Backend (Jest)

```bash
cd server
npm test
```

Test files:
- `src/__tests__/stcService.test.ts` — STC formula, zone lookup, rebate calc
- `src/__tests__/weatherService.test.ts` — mock forecast, risk scoring, advisories
- `src/__tests__/webhooks.test.ts` — Stripe + DocuSeal webhook handlers (Supertest)
- `src/__tests__/scheduling.test.ts` — scheduling rules, duration estimates, EOD check

---

## Key Features

### Job Types

| Type | Min Techs | Est. Duration |
|---|---|---|
| Solar Installation | 2 | 6 h |
| Battery Installation | 1 | 4 h |
| EV Charger | 1 | 3 h |
| Roof Renovation | 2 | 8 h |
| Solar Adjustment | 1 | 2 h |

### Job Lifecycle

```
Enquiry → Quoted → Quote Sent → Quote Accepted →
Deposit Paid → Scheduled → In Progress → Completed →
Invoiced → Paid
```

### STC Rebate Calculation

The Clean Energy Regulator formula:

```
STCs = floor(systemKW × deemingYears × 1.536)
```

Zone deeming years (2024):
- Zone 1 (NT, far-north QLD): 1.622
- Zone 2 (coastal QLD, WA): 1.536
- Zone 3 (VIC, NSW, SA, ACT): 1.382
- Zone 4 (TAS): 1.185

Default STC spot price: **$38 / STC** (configurable via `STC_UNIT_PRICE_AUD`)

### Australian Compliance Documents

- **CES (Certificate of Electrical Safety)** — Energy Safe Victoria, issued under the Electricity Safety Act 1998 (Vic)
- **STC Assignment Form** — Clean Energy Regulator, Renewable Energy (Electricity) Act 2000 (Cth)
- Both generated server-side as PDFs using pdf-lib, stored in Google Cloud Storage and served via signed URLs

### Weather Risk Engine

Automatically flags jobs based on 5-day forecast:

| Risk | Condition |
|---|---|
| High | Wind > 40 km/h OR Rain chance > 70% OR Temp > 38°C |
| Medium | Wind > 25 km/h OR Rain > 40% OR Temp > 34°C |
| Low | All others |

Set `OPENWEATHER_API_KEY` in server `.env` for live data; omit for built-in mock.

---

## Brand

The frontend uses SBG's brand colours extracted from [solarbatterygroup.com.au](https://solarbatterygroup.com.au):

| Token | Hex | Usage |
|---|---|---|
| Primary Blue | `#1d1dff` | Buttons, nav, headers |
| Yellow | `#ffdb14` | Accents, highlights |
| Teal | `#00c9b1` | Secondary actions |
| Dark | `#212529` | Text, dark surfaces |

Fonts: **Anton** (headings) + **Montserrat** (body/UI) via Google Fonts.

---

## Environment Variables

See `client/.env.example` and `server/.env.example` for the full list.

Minimum to get started:
- `DATABASE_URL` — Neon pooled connection string (server)
- `GCS_BUCKET_NAME` + `GOOGLE_APPLICATION_CREDENTIALS` (server)
- `AUTH0_DOMAIN` + `AUTH0_AUDIENCE` (server)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (server)
- `DOCSIGN_API_KEY` + `DOCSIGN_WEBHOOK_SECRET` (server)

---

## API Endpoints

```
GET  /api/customers
GET  /api/customers/:id

GET  /api/enquiries
POST /api/enquiries
GET  /api/enquiries/:id

GET  /api/quotes
POST /api/quotes
GET  /api/quotes/:id/pdf        ← streams PDF
POST /api/quotes/:id/send       ← triggers DocuSeal

GET  /api/jobs
POST /api/jobs
GET  /api/jobs/:id
PUT  /api/jobs/:id/status
POST /api/jobs/:id/technicians

GET  /api/technicians
POST /api/technicians/availability-check

GET  /api/invoices
POST /api/invoices
GET  /api/invoices/:id/pdf

GET  /api/certificates
POST /api/certificates/:jobId/generate
GET  /api/certificates/:id/pdf

GET  /api/weather/:postcode

POST /api/stc/calculate

POST /api/webhooks/stripe
POST /api/webhooks/docuseal
```

---

## Security Notes

- API routes are protected by verifying Auth0 RS256 access tokens against Auth0's JWKS endpoint — no shared secret is held by the server (`server/src/middleware/auth.ts`)
- Stripe webhooks verified with raw-body HMAC (`stripe-signature` header)
- DocuSeal webhooks verified with SHA-256 HMAC + a 5-minute replay window (`x-docuseal-signature` header, format `timestamp.signature`)
- Helmet.js HTTP security headers on all API responses
- Job photos and generated PDFs live in a private GCS bucket, served only via short-lived signed URLs (`GCS_SIGNED_URL_EXPIRY_MINUTES`) — no public ACLs
- GCS service-account credentials and the Neon connection string are **server-only** — never exposed to the browser

---

*Built for Solar Battery Group technical assessment — September 2026*
