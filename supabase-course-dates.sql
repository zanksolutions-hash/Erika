-- CASA PSY / Erika Casa
-- Configuration de Supabase Storage pour le calendrier des cours collectifs.
-- À exécuter dans Supabase > SQL Editor uniquement si le stockage n'est pas déjà configuré.
-- Ne modifie pas les dates existantes et ne supprime aucun fichier.
-- Le site utilise le bucket article-images et l'objet site/course-dates.json.

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do update set public = true;

-- Lecture publique du calendrier (utilisée sur autisme-emploi.html).
drop policy if exists "Public read collective course dates" on storage.objects;
create policy "Public read collective course dates"
on storage.objects
for select
to public
using (
  bucket_id = 'article-images'
  and name = 'site/course-dates.json'
);

drop policy if exists "Authenticated create collective course dates" on storage.objects;
drop policy if exists "Authenticated update collective course dates" on storage.objects;
-- L'écriture du calendrier est réservée à l'administratrice :
-- voir supabase-admin-only.sql.

-- Aucun fichier JSON initial n'est créé par ce script.
-- L'administration propose les six dates par défaut si l'objet est absent,
-- puis l'enregistre à la première utilisation du bouton Enregistrer les dates.
