-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create extension if not exists "pgcrypto";

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_email_key on customers (lower(email)) where email is not null;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  service text not null,
  service_date date not null,
  start_time text,
  duration_hours numeric,
  address text,
  price numeric,
  notes text,
  status text not null default 'confirmed' check (status in ('pending','confirmed','completed','cancelled')),
  source text not null default 'website',
  external_id text unique,
  cancel_reason text,
  created_at timestamptz not null default now()
);
create index if not exists bookings_date_idx on bookings (service_date);

create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- The app talks to the database only from the server with the service-role key.
-- Turning on RLS with no policies blocks all public (anon) access.
alter table customers enable row level security;
alter table bookings enable row level security;
alter table blocked_dates enable row level security;
