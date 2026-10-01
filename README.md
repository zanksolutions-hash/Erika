# Site Erika — Psychologue du travail

Prototype dynamique basé sur le contenu fourni.

## Fonctionnalités
- Site responsive
- Présentation des accompagnements
- Informations pratiques
- Prise de rendez-vous
- Créneaux disponibles calculés dynamiquement
- Blocage des doubles réservations
- Stockage SQLite local
- Endpoint administrateur protégé par une clé

## Lancer en local
1. Installer Node.js 20+
2. Dans le dossier du projet :
   npm install
3. Définir une clé administrateur :
   - macOS/Linux : `export ADMIN_KEY="une-cle-secrete"`
   - Windows PowerShell : `$env:ADMIN_KEY="une-cle-secrete"`
4. Lancer :
   npm start
5. Ouvrir :
   http://localhost:3000

## Rendez-vous
Les créneaux de démonstration sont du lundi au vendredi :
09:00, 10:00, 11:00, 14:00, 15:00, 16:00.

Ils sont modifiables dans `server.js`.

## Avant mise en ligne
- Remplacer téléphone et e-mail
- Ajouter la politique de confidentialité
- Définir la durée de conservation des données
- Utiliser HTTPS
- Utiliser une vraie clé `ADMIN_KEY`
- Ajouter protection anti-spam / rate limiting
- Ajouter confirmation e-mail
- Idéalement synchroniser les réservations avec Google Calendar
- Faire vérifier les mentions légales et obligations RGPD applicables

## API admin
GET `/api/admin/appointments`
Header : `x-admin-key: votre-cle`
