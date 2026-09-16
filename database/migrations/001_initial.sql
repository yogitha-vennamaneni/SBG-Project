-- SBG Scheduler — Initial Database Migration
-- Target: Neon (serverless PostgreSQL 16)
-- Run with psql or any PostgreSQL client against your Neon connection string:
--   psql "$DATABASE_URL" -f database/migrations/001_initial.sql
-- All tables use UUID primary keys

-- Enable UUID extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enum types (all values, both migrations) ────────────────────────────────

CREATE TYPE job_type AS ENUM (
  'solar_installation',
  'battery_installation',
  'ev_charger',
  'roof_renovation',
  'solar_adjustment',
  'Battery install',
  'Solar + battery',
  'Battery upgrade'
);

CREATE TYPE job_status AS ENUM (
  'enquiry',
  'quoted',
  'quote_sent',
  'quote_accepted',
  'quote_declined',
  'deposit_paid',
  'scheduled',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
  'cancelled',
  'unscheduled',
  'confirmed'
);

-- ─── customers ───────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT NOT NULL,
  street        TEXT NOT NULL,
  suburb        TEXT NOT NULL,
  state         CHAR(3) NOT NULL,
  postcode      CHAR(4) NOT NULL,
  nmi           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── enquiries ───────────────────────────────────────────────────────────────

CREATE TABLE enquiries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  job_type              job_type NOT NULL,
  description           TEXT,
  roof_type             TEXT CHECK (roof_type IN ('tile','tin','flat','tilt')),
  system_size_kw        NUMERIC(5,2),
  panel_count           INT,
  battery_capacity_kwh  NUMERIC(5,1),
  existing_solar_kw     NUMERIC(5,2),
  ev_charger_amps       INT CHECK (ev_charger_amps IN (16, 32)),
  phase_type            TEXT CHECK (phase_type IN ('single', 'three')),
  roof_area             NUMERIC(8,2),
  weather_risk          TEXT CHECK (weather_risk IN ('low','medium','high')),
  weather_note          TEXT,
  status                TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','quoted')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── quotes ──────────────────────────────────────────────────────────────────

CREATE TABLE quotes (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquiry_id              UUID REFERENCES enquiries(id),
  customer_id             UUID NOT NULL REFERENCES customers(id),
  job_type                job_type NOT NULL,
  line_items              JSONB NOT NULL DEFAULT '[]',
  subtotal                NUMERIC(10,2) NOT NULL,
  stc_rebate              NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst                     NUMERIC(10,2) NOT NULL,
  total                   NUMERIC(10,2) NOT NULL,
  deposit_amount          NUMERIC(10,2) NOT NULL,
  balance_amount          NUMERIC(10,2) NOT NULL,
  valid_until             DATE NOT NULL,
  docsign_status          TEXT NOT NULL DEFAULT 'draft'
                          CHECK (docsign_status IN ('draft','sent','viewed','signed','declined','expired')),
  docsign_envelope_id     TEXT,
  signed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── installers (was: technicians) ───────────────────────────────────────────

CREATE TABLE installers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  phone            TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('installer','electrician','supervisor')),
  licence_number   TEXT,
  rec_registration TEXT,
  skills           job_type[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  -- scheduling export fields
  installer_code   TEXT UNIQUE,
  state            CHAR(3),
  home_base        TEXT,
  working_days     TEXT[],
  shift_start      TIME,
  shift_end        TIME,
  leave_start      DATE,
  leave_end        DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_installers_state ON installers (state);

CREATE TABLE installer_availability (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installer_id   UUID NOT NULL REFERENCES installers(id) ON DELETE CASCADE,
  day_of_week    INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  UNIQUE (installer_id, day_of_week)
);

-- ─── jobs ────────────────────────────────────────────────────────────────────

CREATE TABLE jobs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id              UUID REFERENCES quotes(id),
  -- customer_id nullable: original jobs link to customers table;
  -- scheduling-export jobs carry inline contact fields instead
  customer_id           UUID REFERENCES customers(id),
  job_type              job_type NOT NULL,
  status                job_status NOT NULL DEFAULT 'enquiry',
  scheduled_date        DATE,
  scheduled_start_time  TIME,
  estimated_duration    INT NOT NULL DEFAULT 240,
  street                TEXT NOT NULL,
  suburb                TEXT NOT NULL,
  state                 CHAR(3) NOT NULL,
  postcode              CHAR(4) NOT NULL,
  nmi                   TEXT,
  system_size_kw        NUMERIC(5,2),
  panel_count           INT,
  panel_model           TEXT,
  inverter_model        TEXT,
  battery_model         TEXT,
  weather_risk          TEXT CHECK (weather_risk IN ('low','medium','high')),
  notes                 TEXT,
  completed_at          TIMESTAMPTZ,
  -- scheduling export fields
  job_code              TEXT UNIQUE,
  customer_name         TEXT,
  customer_phone        TEXT,
  customer_email        TEXT,
  scheduled_start       TIMESTAMPTZ,
  duration_blocks       INT,
  assigned_installer_id UUID REFERENCES installers(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_installers (
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  installer_id  UUID NOT NULL REFERENCES installers(id),
  PRIMARY KEY (job_id, installer_id)
);

-- ─── job status history ──────────────────────────────────────────────────────

CREATE TABLE job_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status      job_status NOT NULL,
  note        TEXT,
  updated_by  TEXT NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── job photos ──────────────────────────────────────────────────────────────

CREATE TABLE job_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES installers(id),
  storage_path  TEXT NOT NULL,
  signed_url    TEXT NOT NULL,
  thumbnail_url TEXT,
  caption       TEXT,
  phase         TEXT NOT NULL CHECK (phase IN ('before','during','after')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── invoices ────────────────────────────────────────────────────────────────

CREATE TABLE invoices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID NOT NULL REFERENCES jobs(id),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  invoice_number        TEXT NOT NULL UNIQUE,
  type                  TEXT NOT NULL CHECK (type IN ('deposit','balance','full')),
  line_items            JSONB NOT NULL DEFAULT '[]',
  subtotal              NUMERIC(10,2) NOT NULL,
  gst                   NUMERIC(10,2) NOT NULL,
  total                 NUMERIC(10,2) NOT NULL,
  due_date              DATE NOT NULL,
  paid_at               TIMESTAMPTZ,
  stripe_payment_link   TEXT,
  stripe_payment_intent TEXT,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','paid','overdue','void')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── certificates ────────────────────────────────────────────────────────────

CREATE TABLE certificates (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                 UUID NOT NULL REFERENCES jobs(id),
  type                   TEXT NOT NULL CHECK (type IN ('CES','STC_assignment','service_report')),
  ces_work_description   TEXT,
  ces_licence_number     TEXT,
  ces_rec_registration   TEXT,
  ces_completion_date    DATE,
  ces_certification_date DATE,
  stc_panel_serials      TEXT[],
  stc_system_owner       TEXT,
  stc_install_date       DATE,
  stc_system_size_kw     NUMERIC(5,2),
  stc_certificate_qty    INT,
  pdf_storage_path       TEXT,
  pdf_signed_url         TEXT,
  generated_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── weather cache ───────────────────────────────────────────────────────────

CREATE TABLE weather_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode    CHAR(4) NOT NULL,
  forecast    JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '6 hours'
);

-- ─── rate cards ──────────────────────────────────────────────────────────────

CREATE TABLE rate_cards (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type       job_type NOT NULL,
  description    TEXT NOT NULL,
  unit           TEXT NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_jobs_status              ON jobs (status);
CREATE INDEX idx_jobs_scheduled_date      ON jobs (scheduled_date);
CREATE INDEX idx_jobs_scheduled_start     ON jobs (scheduled_start);
CREATE INDEX idx_jobs_customer            ON jobs (customer_id);
CREATE INDEX idx_jobs_assigned_installer  ON jobs (assigned_installer_id);
CREATE INDEX idx_job_installers_installer ON job_installers (installer_id);
CREATE INDEX idx_invoices_job             ON invoices (job_id);
CREATE INDEX idx_certificates_job         ON certificates (job_id);
CREATE INDEX idx_weather_cache_postcode   ON weather_cache (postcode);
CREATE INDEX idx_weather_cache_expires    ON weather_cache (expires_at);
