# Site Erika Casa — Psychologue du travail

Version statique avec espace Articles / Blog.

## Positionnement
Le site présente Erika Casa principalement comme psychologue du travail.
L’autisme et l’inclusion sont traités comme des sujets éditoriaux dans la section Articles,
au même titre que le burnout et la réorientation professionnelle.

## Structure
- `index.html` : page d’accueil
- `style.css` : design global
- `app.js` : menu mobile
- `assets/` : visuels
- `articles/` : pages d’articles

## Ajouter un nouvel article
1. Copier une page HTML dans le dossier `articles/`.
2. Modifier le titre, le contenu et l’image.
3. Ajouter une nouvelle carte dans la section `#articles` de `index.html`.

## Publication GitHub Pages
Le site est entièrement statique et peut être publié directement via GitHub Pages.


## Administration des articles

La page `admin.html` permet de créer, modifier et supprimer des articles sans toucher au HTML.

Champs disponibles :
- titre
- date
- catégorie
- temps de lecture
- résumé
- photo
- texte
- nom de la source
- URL de la source
- texte alternatif de l'image

### Important : mode de démonstration actuel
La version fournie utilise `localStorage`, donc les articles sont enregistrés uniquement dans le navigateur où ils ont été créés.

Cela permet de tester tout le parcours sans commit GitHub :
`admin.html` → publication → vignette automatique sur l'accueil → article complet.

Pour que la cliente puisse publier réellement pour tous les visiteurs sans commit GitHub,
il faudra brancher l'interface à une base de données et un stockage d'images en ligne
(par exemple Supabase) avec authentification administrateur.


## Nouvelle structure Articles

- `index.html` : accueil avec uniquement un aperçu des articles.
- `articles.html` : page dédiée contenant tous les articles.
- `articles/*.html` : articles statiques complets.
- `article-dynamique.html` : article créé via l'administration.
- `admin.html` : création et gestion des nouveaux articles.

Les nouveaux articles créés depuis l'administration :
1. apparaissent dans `articles.html`;
2. les trois plus récents remontent automatiquement sur l'accueil;
3. s'ouvrent sur une page article séparée.
