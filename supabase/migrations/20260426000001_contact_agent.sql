-- Agent contacts (one person representing multiple brands).

alter table public.contacts
  add column if not exists is_agent boolean not null default false;

create table if not exists public.contact_companies (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (contact_id, company_id)
);

create index if not exists contact_companies_company_idx on public.contact_companies (company_id);

alter table public.contact_companies enable row level security;

create policy "contact_companies_owner_all"
  on public.contact_companies
  for all
  to authenticated
  using (
    exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())
  );
