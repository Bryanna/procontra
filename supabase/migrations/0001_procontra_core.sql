-- PROCONTRA core schema. Critical writes are server-only.
create extension if not exists pgcrypto;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('administrator','coordinator','pharmacist','inventory','attention','direction')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.branch_memberships (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (profile_id, branch_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique,
  full_name text not null,
  phone text not null,
  government_id_encrypted text,
  preferred_branch_id uuid references public.branches(id),
  insurer text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  channel text not null,
  purposes text[] not null,
  status text not null check (status in ('active','opted_out','expired','revoked')),
  policy_version text not null,
  granted_at timestamptz not null,
  opted_out_at timestamptz,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  presentation text,
  active boolean not null default true,
  catalog_version text,
  created_at timestamptz not null default now()
);

create table public.inventory_positions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  branch_id uuid not null references public.branches(id),
  on_hand numeric(14,3) not null check (on_hand >= 0),
  reserved numeric(14,3) not null default 0 check (reserved >= 0 and reserved <= on_hand),
  reorder_minimum numeric(14,3) not null default 0 check (reorder_minimum >= 0),
  lot text not null,
  expiry_date date not null,
  cost numeric(14,2),
  price numeric(14,2),
  updated_at timestamptz not null,
  source text not null,
  unique (product_id, branch_id, lot)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  source_scope text not null,
  content_hash text not null,
  document_type text not null check (document_type in ('invoice','authorization','prescription','other')),
  reference text,
  status text not null check (status in ('received','classified','extracted','review_required','validated','linked','posted','possible_duplicate')),
  storage_path text not null,
  patient_id uuid references public.patients(id),
  branch_id uuid references public.branches(id),
  extractor_version text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (source_scope, content_hash)
);

create unique index documents_reference_by_scope
  on public.documents(source_scope, document_type, reference)
  where reference is not null;

create table public.dispensations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  patient_id uuid not null references public.patients(id),
  branch_id uuid not null references public.branches(id),
  status text not null check (status in ('draft','validated','posted','reversed')),
  posted_at timestamptz,
  reversed_from_id uuid references public.dispensations(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.dispensation_items (
  id uuid primary key default gen_random_uuid(),
  dispensation_id uuid not null references public.dispensations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  units_per_day numeric(14,4),
  directions_verified boolean not null default false
);

create table public.dispensation_documents (
  dispensation_id uuid not null references public.dispensations(id) on delete cascade,
  document_id uuid not null references public.documents(id),
  primary key (dispensation_id, document_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  dispensation_id uuid references public.dispensations(id),
  product_id uuid not null references public.products(id),
  branch_id uuid not null references public.branches(id),
  movement_type text not null check (movement_type in ('dispensation','reversal','reservation','release','adjustment','transfer_in','transfer_out')),
  quantity numeric(14,3) not null,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (dispensation_id, movement_type)
);

create table public.continuity_cycles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  dispensation_item_id uuid not null unique references public.dispensation_items(id),
  status text not null check (status in ('calculated','review_required','active','closed')),
  coverage_days integer,
  depletion_date date,
  alert_date date,
  rule_version text not null,
  review_reason text,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.continuity_cycles(id),
  template_version text not null,
  scheduled_at timestamptz not null,
  status text not null check (status in ('scheduled','stock_review','ready','sent','responded','reserved','delivery','closed','cancelled')),
  provider_receipt text,
  inventory_snapshot_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cycle_id, template_version, scheduled_at)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  patient_id uuid not null references public.patients(id),
  product_id uuid not null references public.products(id),
  branch_id uuid not null references public.branches(id),
  quantity numeric(14,3) not null check (quantity > 0),
  status text not null check (status in ('created','confirmed','collected','delivered','expired','cancelled')),
  expires_at timestamptz not null,
  confirmed_by uuid references public.profiles(id),
  dispensation_id uuid references public.dispensations(id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  priority text not null check (priority in ('low','normal','high','urgent')),
  status text not null check (status in ('open','in_progress','completed','cancelled')),
  branch_id uuid references public.branches(id),
  patient_id uuid references public.patients(id),
  assigned_to uuid references public.profiles(id),
  due_at timestamptz,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  branch_id uuid references public.branches(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  correlation_id uuid not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  idempotency_key text not null unique,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','claimed','sent','failed','cancelled')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  provider_receipt text,
  created_at timestamptz not null default now()
);

insert into public.branches(code, name, address) values
  ('70', 'Esperanza', 'Avenida María Trinidad Sánchez'),
  ('01', 'Amina', 'Calle principal'),
  ('81', 'Jaibón', 'Autopista Duarte'),
  ('48', 'Maizal', 'Autopista Duarte')
on conflict (code) do nothing;

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.branch_memberships enable row level security;
alter table public.patients enable row level security;
alter table public.consents enable row level security;
alter table public.products enable row level security;
alter table public.inventory_positions enable row level security;
alter table public.documents enable row level security;
alter table public.dispensations enable row level security;
alter table public.dispensation_items enable row level security;
alter table public.dispensation_documents enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.continuity_cycles enable row level security;
alter table public.alerts enable row level security;
alter table public.reservations enable row level security;
alter table public.tasks enable row level security;
alter table public.audit_events enable row level security;
alter table public.outbox_events enable row level security;

-- The service_role is used only by server-only use cases and workers.
create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "branches authenticated read" on public.branches for select to authenticated using (true);
create policy "products authenticated read" on public.products for select to authenticated using (true);

-- Branch-sensitive policies are completed after authenticated staff memberships are provisioned.
-- No browser write policy is intentionally granted for critical operational tables.
revoke all on public.patients, public.consents, public.inventory_positions, public.documents,
  public.dispensations, public.inventory_movements, public.continuity_cycles,
  public.alerts, public.reservations, public.audit_events, public.outbox_events from anon;
