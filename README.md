# SimonGMAO

Application GMAO (Gestion de Maintenance Assistee par Ordinateur) pour gérer les équipements, le stock de pièces, les documents techniques et les utilisateurs.

## 🎯 C'est quoi, exactement ?
[Contenu généré par IA]

Le GMAO, c'est un gestionnaire complet pour les activités de maintenance. L'objectif principal :

- *Tracer tous les équipements* (machines, ateliers) et leurs états
- *Gérer les interventions de maintenance* (demandes, assignations, suivi, cloture)
- *Suivre les stocks* de pièces détachées et les mouvements
- *Gérer les documents* techniques (fiches, photos, manuels, etc.)
- *Contrôler les accès* via un système d'authentification et de rôles
- *Auditer chaque action* pour la traçabilité

## Objectif

Le projet permet de :

- gérer les ateliers, machines et éléments techniques ;
- suivre les pièces, fournisseurs et mouvements de stock ;
- gérer les documents techniques avec versionnement ;
- administrer les utilisateurs et les rôles (`ADMIN`, `MAINTENANCE`, `PRODUCTION`) ;
- afficher un tableau de bord adapté au rôle connecté.

## Architecture

Monorepo composé de :

- `backend/`: API REST Node.js (`Express` + `Prisma` + `PostgreSQL`)
- `frontend/`: SPA Vue 3 (`Vite` + `Pinia` + `Vue Router`)
- `docker-compose.yml`: stack locale complète (`db` + `backend` + `frontend`)

### Pile technique

- Backend: Node.js, Express, Prisma, PostgreSQL
- Frontend: Vue 3, Vite, Pinia, Vue Router, Axios
- Outils: Docker Compose

## Prérequis

- Node.js 18+ recommandé
- npm
- Docker Desktop (pour le mode Docker)
- PostgreSQL (si exécution hors Docker)

## Démarrage rapide avec Docker

Depuis la racine du projet :

```bash
npm run docker:up
```

URLs utiles :

- Frontend: `http://localhost:8080`
- API santé : `http://localhost:3000/api/health`

Commandes associées :

```bash
npm run docker:logs
npm run docker:down
npm run docker:reset
```

`docker:reset` supprime aussi le volume PostgreSQL.

## Démarrage local (sans Docker)

### 1. Installer les dépendances

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Préparer PostgreSQL

La configuration locale attendue par les scripts racine est :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gmao
```

Puis appliquer le schéma :

```bash
npm --prefix backend run db:push
```

Optionnel (données initiales) :

```bash
npm --prefix backend run db:seed
```

### 3. Lancer en développement

Depuis la racine :

```bash
npm run dev
```

Ce script :

- libère les ports `3000` et `5173` ;
- lance le backend sur `http://localhost:3000`;
- lance le frontend sur `http://localhost:5173`.

## Variables d'environnement

En exécution manuelle du backend (`npm --prefix backend run dev`), définir au minimum :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gmao
JWT_SECRET=dev_jwt_secret_change_me
ADMIN_CONFIRM_CODE=123456
FRONTEND_URL=http://localhost:5173
```

Variables utiles supplémentaires :

- `PORT` (défaut `3000`)
- `JWT_EXPIRES_IN` (défaut `15m`)
- `SALT_ROUNDS` (défaut `12`)
- `UPLOADS_DIR` (défaut `./uploads`)
- `MAX_FILE_SIZE_MB` (défaut `20`)

## Scripts disponibles

### Racine

- `npm run dev`: backend + frontend en parallèle
- `npm run dev:backend`: backend seul avec variables de dev
- `npm run dev:frontend`: frontend seul
- `npm run docker:up`: build + démarrage Docker
- `npm run docker:down`: arrêt Docker
- `npm run docker:logs`: logs Docker en continu
- `npm run docker:reset`: arrêt + suppression volumes

### Backend (`backend/package.json`)

- `npm run dev`
- `npm start`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:studio`
- `npm run migrate`

### Frontend (`frontend/package.json`)

- `npm run dev`
- `npm run build`
- `npm run preview`

## Modules API exposés

Routes montées dans `backend/src/app.js` :

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/users` (et routes associées CRUD admin)
- `GET /api/dashboard`
- `GET /api/dashboard/alertes`
- `GET /api/equipements/...`
- `GET /api/stock/...`
- `GET /api/documents/...`
- `GET /api/health`

Note : le schéma Prisma contient des modèles `Intervention`, mais il n'y a pas encore de module `interventions` monté dans les routes de l'API.

## Sécurité

Le backend active :

- `helmet`
- `cors` avec origine contrôlée (`FRONTEND_URL`)
- limitation des tentatives de login (`express-rate-limit`)
- hash des mots de passe via `bcryptjs`
- JWT + refresh token (cookie HTTP-only)


## 🚨 Dépannage courant
[Contenu généré par IA]

### Échec de `npm run dev`

- vérifier que PostgreSQL est démarré sur `localhost:5432`;
- vérifier que la base `gmao` existe;
- relancer `npm --prefix backend run db:push`.

### Port déjà utilisé

Le script `npm run dev` tente de libérer `3000` et `5173`. Si nécessaire, fermer les processus qui occupent ces ports puis relancer.

### Erreurs CORS

Vérifier que `FRONTEND_URL` du backend correspond à l'URL frontend en cours :

- local Vite: `http://localhost:5173`
- Docker (frontend via Nginx): `http://localhost:8080`

### La BD ne se connecte pas
Vérifie que PostgreSQL est lancé
Vérifie DATABASE_URL dans .env
Essaie de créer la base manuellement :
psql -U postgres -c "CREATE DATABASE gmao_db;"

### Les routes retournent 404
Vérifie que le backend est démarré
Vérifie que les routes sont importées dans app.js
Regarde les logs dans la console

### CORS error en front
Vérifie que FRONTEND_URL dans .env du backend match
ex: http://localhost:5173 pour le dev


## 💡 Conseils de développement
[Contenu généré par IA]

1. *Ajouter un nouvel endpoint ?*
   - Crée un dossier dans src/modules/<nom>/
   - Suis le pattern : controller, service, repository, routes
   - Importe dans app.js

2. *Modifier la BD ?*
   - Édite prisma/schema.prisma
   - Lance npm run db:push (dev) ou npm run migrate (prod)

3. *Tester les routes ?*
   - Utilise Postman, Insomnia, ou curl
   - N'oublie pas le JWT dans les headers : Authorization: Bearer <token>

4. *Logs d'audit ?*
   - Regarde journal_actions dans la BD
   - Chaque action créée, modifiée, supprimée est tracée
   
Dernière mise à jour: juillet 2026