# 👑 META MISS & MASTER

Plateforme de concours en ligne avec votes payants — Miss & Master.

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | Node.js + Express |
| Frontend | Next.js 14 (TypeScript) |
| Base de données | PostgreSQL + Prisma ORM |
| Paiement | Flutterwave (MTN, Orange, Carte) |
| Auth | JWT (access + refresh token) |
| Temps réel | Socket.io |
| Styles | Tailwind CSS |
| State | Zustand |

## Architecture

```
meta-miss-master/
├── backend/
│   ├── prisma/schema.prisma       # Modèles DB
│   └── src/
│       ├── controllers/           # Logique HTTP
│       ├── services/              # Logique métier
│       ├── routes/                # Définition des routes
│       ├── middlewares/           # Auth, rate-limit, upload
│       ├── socket/                # WebSocket temps réel
│       └── utils/                 # Logger, errors, seed
├── frontend/
│   └── src/
│       ├── app/                   # Pages Next.js (App Router)
│       ├── components/            # Composants React
│       ├── lib/                   # Axios instance
│       └── store/                 # Zustand stores
├── config/
│   └── nginx.conf                 # Config Nginx production
├── docker-compose.yml
└── ecosystem.config.js            # PM2
```

## Installation locale (sans Docker)

### Prérequis
- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### 1. Cloner et installer

```bash
git clone <repo>
cd meta-miss-master
npm run install:all
```

### 2. Variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Base de données

```bash
# Créer la DB dans psql
createdb metamissmaster

# Appliquer le schéma Prisma
cd backend
npx prisma migrate dev --name init

# Seed (admin + candidats de test)
npm run seed
```

### 4. Lancer en développement

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Frontend : http://localhost:3000
- Backend API : http://localhost:5000/api
- Health check : http://localhost:5000/health

**Compte admin de test :**
- Email : `admin@metamissmaster.cm`
- Mot de passe : `Admin@123456`

---

## Configuration Flutterwave

### Étape 1 — Créer un compte
1. Rendez-vous sur https://dashboard.flutterwave.com
2. Créez un compte et complétez la vérification

### Étape 2 — Récupérer les clés
Dans **Settings → API** :
- `FLW_PUBLIC_KEY` → Public Key
- `FLW_SECRET_KEY` → Secret Key
- `FLW_SECRET_HASH` → Webhook Hash (à définir vous-même)

### Étape 3 — Configurer le webhook
Dans **Settings → Webhooks** :
- URL : `https://votre-domaine.com/api/payments/webhook`
- Secret Hash : même valeur que `FLW_SECRET_HASH` dans votre `.env`
- Événements : cocher `charge.completed`

### Étape 4 — URL de redirection
Dans **Settings → Payment Pages** :
- Redirect URL : `https://votre-domaine.com/vote/callback`

---

## API Reference

### Auth
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/refresh` | Rafraîchir le token |
| GET | `/api/auth/me` | Profil connecté |

### Candidats
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/candidates` | Liste paginée |
| GET | `/api/candidates/top` | Top candidats |
| GET | `/api/candidates/:id` | Profil candidat |
| POST | `/api/candidates/register` | Soumettre candidature |

### Paiements
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/payments/initialize` | Init paiement Flutterwave |
| GET | `/api/payments/verify/:txRef` | Vérifier après redirect |
| POST | `/api/payments/webhook` | Webhook Flutterwave |
| GET | `/api/payments/history` | Historique utilisateur |

### Classement
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/ranking` | Classement global |
| GET | `/api/ranking/top` | Top N |
| GET | `/api/ranking/stats` | Statistiques globales |

### Admin (JWT + rôle ADMIN requis)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/candidates` | Tous les candidats |
| PATCH | `/api/admin/candidates/:id/approve` | Approuver |
| PATCH | `/api/admin/candidates/:id/reject` | Rejeter |
| DELETE | `/api/admin/candidates/:id` | Supprimer |
| GET | `/api/admin/payments` | Tous les paiements |
| POST | `/api/admin/payments/:id/refund` | Rembourser |
| DELETE | `/api/admin/votes/:id` | Supprimer vote (fraude) |
| POST | `/api/admin/contest` | Créer concours |
| PATCH | `/api/admin/contest/:id/close` | Fermer votes |
| PATCH | `/api/admin/contest/:id/open` | Ouvrir votes |

---

## Installation avec Docker

```bash
cp .env.example .env
# Éditer .env

docker-compose up -d --build

# Seed (première fois uniquement)
docker exec mmm_backend node src/utils/seed.js
```

---

## Tests manuels

```bash
# Health check
curl http://localhost:5000/health

# Inscription
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Password123"}'

# Classement
curl http://localhost:5000/api/ranking?type=MISS
```
