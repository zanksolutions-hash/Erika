-- CASA PSY / Erika Casa
-- Restreint la modification des articles, des images et des dates de cours
-- au seul compte administrateur (Erika).
-- À exécuter une seule fois dans Supabase > SQL Editor, après supabase-setup.sql.
--
-- AVANT D'EXÉCUTER : remplacer EMAIL_D_ERIKA ci-dessous par l'adresse e-mail
-- du compte qu'Erika utilise pour se connecter à l'administration.
-- Si aucun compte ne correspond, le script s'arrête sans rien modifier.

begin;

-- Liste des comptes autorisés à administrer le site.
-- RLS activé sans aucune policy : la table n'est ni lisible ni modifiable via l'API.
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;

insert into public.site_admins (user_id)
select id from auth.users where lower(email) = lower('EMAIL_D_ERIKA')
on conflict (user_id) do nothing;

do $$
begin
  if not exists (select 1 from public.site_admins) then
    raise exception 'Aucun compte administrateur trouvé : vérifier l''adresse e-mail remplacée dans le script.';
  end if;
end;
$$;

-- Vrai uniquement pour un compte présent dans site_admins.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

-- Articles : lecture publique des articles publiés, gestion réservée à l'admin.
drop policy if exists "Authenticated manage articles" on public.articles;
drop policy if exists "Admin manage articles" on public.articles;
create policy "Admin manage articles"
on public.articles
for all
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

-- Images des articles et calendrier des cours (bucket article-images).
drop policy if exists "Authenticated upload article images" on storage.objects;
drop policy if exists "Authenticated update article images" on storage.objects;
drop policy if exists "Authenticated delete article images" on storage.objects;
drop policy if exists "Authenticated create collective course dates" on storage.objects;
drop policy if exists "Authenticated update collective course dates" on storage.objects;

drop policy if exists "Admin upload article images" on storage.objects;
create policy "Admin upload article images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'article-images' and public.is_site_admin());

drop policy if exists "Admin update article images" on storage.objects;
create policy "Admin update article images"
on storage.objects
for update
to authenticated
using (bucket_id = 'article-images' and public.is_site_admin())
with check (bucket_id = 'article-images' and public.is_site_admin());

drop policy if exists "Admin delete article images" on storage.objects;
create policy "Admin delete article images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'article-images' and public.is_site_admin());

commit;

-- Vérification (facultatif) : doit lister uniquement les policies "Public read ..."
-- et "Admin ...".
-- select tablename, policyname, roles, cmd from pg_policies
-- where tablename in ('articles', 'objects') order by tablename, policyname;
