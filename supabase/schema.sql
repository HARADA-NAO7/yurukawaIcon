create extension if not exists "pgcrypto";

create table if not exists public.icons (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  keyword1 text not null,
  keyword2 text not null,
  keyword3 text not null,
  theme text not null check (theme in ('pastel', 'neon', 'vivid', 'mono')),
  created_at timestamptz not null default now()
);

create index if not exists icons_created_at_idx on public.icons (created_at desc);
