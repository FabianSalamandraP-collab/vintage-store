-- Supabase schema for Vintage Store
-- Run this in Supabase SQL editor or via CLI

-- TABLE: categories
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  created_at timestamp with time zone default now()
);

-- TABLE: products
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  category_id bigint references public.categories(id) on delete set null,
  condition text,
  featured boolean not null default false,
  tags text[] default '{}',
  is_active boolean not null default true,
  slug text not null unique,
  stock_quantity integer not null default 0,
  stock_status text not null default 'available', -- available | low_stock | out_of_stock
  min_stock_level integer not null default 1,
  max_stock_level integer not null default 100,
  sku text,
  weight numeric(10,3),
  dimensions jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists products_is_active_idx on public.products(is_active);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_slug_idx on public.products(slug);

-- TABLE: product_images
create table if not exists public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists product_images_primary_idx on public.product_images(product_id, is_primary);

-- TABLE: product_variants
create table if not exists public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  size text,
  stock_quantity integer not null default 0,
  is_available boolean not null default true,
  created_at timestamp with time zone default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

-- TABLE: product_history
create table if not exists public.product_history (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  action text not null,
  field_name text,
  old_value text,
  new_value text,
  changed_by text,
  notes text,
  created_at timestamp with time zone default now()
);

create index if not exists product_history_product_id_idx on public.product_history(product_id);
create index if not exists product_history_action_idx on public.product_history(action);

-- TABLE: stock_movements
create table if not exists public.stock_movements (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  movement_type text not null, -- in | out | adjustment
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text,
  reference_id text,
  created_by text,
  notes text,
  created_at timestamp with time zone default now()
);

create index if not exists stock_movements_product_id_idx on public.stock_movements(product_id);
create index if not exists stock_movements_type_idx on public.stock_movements(movement_type);

-- RLS
-- Enable Row Level Security
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_history enable row level security;
alter table public.stock_movements enable row level security;

-- Policies: allow public read of active products and related tables
create policy if not exists "Public read active products" on public.products
  for select
  to anon
  using (is_active = true);

create policy if not exists "Public read product images" on public.product_images
  for select
  to anon
  using (true);

create policy if not exists "Public read product variants" on public.product_variants
  for select
  to anon
  using (true);

-- Admin writes will use service-role key (bypass RLS)
-- No explicit insert/update/delete policies required for admin since service-role bypasses RLS.

-- Optional: keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();