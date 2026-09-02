# REINES DU META

Plateforme de concours en ligne avec votes payants.
Design dark/gold luxueux, temps réel via WebSocket.

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | Node.js + Express |
| Frontend | Next.js 14 (TypeScript) |
| Base de données | PostgreSQL + Prisma ORM |
| Paiement Afrique | **Fapshi** (MTN/Orange Cameroun) + **CinetPay** (multi-pays) |
| Paiement international | **Stripe** (carte bancaire) |
| Auth | JWT (access + refresh token) |
| Temps réel | Socket.io |
| Styles | Tailwind CSS + CSS Variables |

## Architecture

```
reines-du-meta/
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── controllers/
│       ├── services/
│       │   └── payment.service.js  ← Fapshi + CinetPay + Stripe
│       ├── routes/
│       ├── middlewares/
│       └── socket/
├── frontend/
│   └── src/
│       ├── app/          ← Pages Next.js
│       ├── components/   ← UI components
│       ├── lib/          ← Axios instance
│       └── store/        ← Zustand
├── config/nginx.conf
├── docker-compose.yml
└── ecosystem.config.js
```

## Installation locale

### Prérequis
- Node.js >= 18
- PostgreSQL >= 14

### 1. Installer
```bash
npm run install:all
```

### 2. Variables d'environnement
```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
# → Remplir les variables (voir sections ci-dessous)
```

### 3. Base de données
```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

### 4. Lancer
```bash
# Terminal 1
cd backend && npm run dev   # port 5000

# Terminal 2
cd frontend && npm run dev  # port 3000
```

Compte admin seed : `admin@metamissmaster.cm` / `Admin@123456`

---

## Configuration Fapshi (Mobile Money Cameroun)

1. Créez un compte sur https://fapshi.com
2. Dashboard → **API Settings** → copiez :
   - `FAPSHI_API_USER`
   - `FAPSHI_API_KEY`
3. **Webhook URL** : `https://VOTRE_BACKEND/api/payments/webhook/fapshi`

---

## Configuration CinetPay (Mobile Money multi-pays)

1. Créez un compte sur https://cinetpay.com
2. Dashboard → **API** → copiez :
   - `CINETPAY_API_KEY`
   - `CINETPAY_SITE_ID`
3. **Notify URL** : `https://VOTRE_BACKEND/api/payments/webhook/cinetpay`
4. **Return URL** : `https://VOTRE_FRONTEND/vote/callback`

---

## Configuration Stripe (Carte internationale)

1. Créez un compte sur https://stripe.com
2. Dashboard → **Developers → API keys** → copiez `sk_live_...`
3. Dashboard → **Developers → Webhooks → Add endpoint** :
   - URL : `https://VOTRE_BACKEND/api/payments/webhook/stripe`
   - Événement : `checkout.session.completed`
   - Copiez le **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

---

## API Référence

### Auth
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Profil connecté |

### Candidats
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/candidates` | Liste paginée |
| GET | `/api/candidates/top` | Top candidats |
| GET | `/api/candidates/:id` | Profil |
| POST | `/api/candidates/register` | Soumettre candidature (multipart) |

### Paiements
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/payments/initialize` | Init paiement (body: `{candidateId, amount, provider}`) |
| GET | `/api/payments/verify/:txRef` | Vérifier après redirect |
| POST | `/api/payments/webhook/fapshi` | Webhook Fapshi |
| POST | `/api/payments/webhook/cinetpay` | Webhook CinetPay |
| POST | `/api/payments/webhook/stripe` | Webhook Stripe |
| GET | `/api/payments/history` | Historique utilisateur |

### Classement
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/ranking` | Classement global (`?type=MISS\|MASTER`) |
| GET | `/api/ranking/top` | Top N (`?n=5`) |
| GET | `/api/ranking/stats` | Statistiques globales |

### Admin (JWT + rôle ADMIN)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard |
| GET/PATCH/DELETE | `/api/admin/candidates/...` | Gestion candidats |
| GET/POST | `/api/admin/payments/...` | Gestion paiements |
| DELETE | `/api/admin/votes/:id` | Supprimer vote (fraude) |
| PATCH | `/api/admin/contest/:id/close\|open` | Contrôle votes |

---

## Déploiement

Voir **DEPLOYMENT.md** pour le guide complet Railway (recommandé) et Docker.
