-- CASA PSY / Erika Casa
-- À exécuter une seule fois dans Supabase > SQL Editor.

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publication_date date not null default current_date,
  category text not null default '',
  reading_time text,
  excerpt text not null default '',
  body text not null default '',
  image_url text,
  image_path text,
  image_alt text,
  source_label text,
  source_url text,
  status text not null default 'published'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_publication_date_idx
  on public.articles (publication_date desc);

alter table public.articles enable row level security;

drop policy if exists "Public read published articles" on public.articles;
create policy "Public read published articles"
on public.articles
for select
to public
using (status = 'published');

drop policy if exists "Authenticated manage articles" on public.articles;
-- Les droits d'écriture (réservés à l'administratrice) sont définis dans
-- supabase-admin-only.sql, à exécuter après ce script.

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read article images" on storage.objects;
create policy "Public read article images"
on storage.objects
for select
to public
using (bucket_id = 'article-images');

drop policy if exists "Authenticated upload article images" on storage.objects;
drop policy if exists "Authenticated update article images" on storage.objects;
drop policy if exists "Authenticated delete article images" on storage.objects;
-- Les droits d'écriture (réservés à l'administratrice) sont définis dans
-- supabase-admin-only.sql, à exécuter après ce script.
