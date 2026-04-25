-- ============================================================================
-- Extend companies with the rich fields from the official Salone catalog API
-- ============================================================================

alter table public.companies
  add column if not exists external_id    text unique,        -- erpId from catalog
  add column if not exists email          text,
  add column if not exists email_alt      text,               -- emailDigitale
  add column if not exists phone          text,
  add column if not exists fax            text,
  add column if not exists address        text,
  add column if not exists postal_code    text,
  add column if not exists city           text,
  add column if not exists province       text,
  add column if not exists country        text,               -- ISO3 code
  add column if not exists event_code     text,               -- SMI / EUC / FTK / ARB / S_P / RAR / EIM
  add column if not exists category_en    text,
  add column if not exists category_it    text,
  add column if not exists products_en    text,
  add column if not exists products_it    text,
  add column if not exists thematic_paths text,
  add column if not exists language       text;               -- IT/EN/FR/DE/...

create index if not exists companies_country_idx on public.companies (country);
create index if not exists companies_event_idx   on public.companies (event_code);
create index if not exists companies_city_idx    on public.companies (city);
