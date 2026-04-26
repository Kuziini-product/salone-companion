-- Geocoded coordinates for company addresses (lazy-populated by an importer
-- script that calls a free geocoder).

alter table public.companies
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6),
  add column if not exists geocoded_at timestamptz;

create index if not exists companies_geo_idx
  on public.companies (lat, lng)
  where lat is not null;
