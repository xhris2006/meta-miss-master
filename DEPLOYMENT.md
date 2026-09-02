# 🚀 DEPLOYMENT.md — Déploiement sur Railway

Railway est la plateforme recommandée pour REINES DU META.
Déploiement complet en moins de 15 minutes, sans serveur à gérer.

---

## 🏗️ Architecture Railway

```
Railway Project
├── Service: mmm-backend    (Node.js Express)
├── Service: mmm-frontend   (Next.js)
└── Service: mmm-postgres   (PostgreSQL managé)
```

---

## Étape 1 — Créer un compte Railway

1. Rendez-vous sur https://railway.app
2. Sign up avec GitHub (recommandé)
3. Créez un nouveau **Project** : **New Project → Empty Project**

---

## Étape 2 — Base de données PostgreSQL

Dans votre projet Railway :

1. Cliquez **+ New Service → Database → PostgreSQL**
2. Railway crée automatiquement la base
3. Cliquez sur le service PostgreSQL → onglet **Variables**
4. Copiez la variable `DATABASE_URL` (format : `postgresql://...`)

Gardez cette URL, vous en aurez besoin pour le backend.

---

## Étape 3 — Déployer le Backend

### 3.1 Depuis GitHub (recommandé)

1. Poussez votre code sur GitHub
2. Dans Railway : **+ New Service → GitHub Repo**
3. Sélectionnez votre repo
4. **Root Directory** : `backend`
5. Railway détecte Node.js automatiquement

### 3.2 Variables d'environnement du backend

Dans Railway → service backend → onglet **Variables**, ajoutez :

```
NODE_ENV=production
PORT=5000
DATABASE_URL=${{mmm-postgres.DATABASE_URL}}
BACKEND_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://VOTRE_FRONTEND.railway.app

JWT_SECRET=                  ← openssl rand -hex 32
JWT_REFRESH_SECRET=          ← openssl rand -hex 32 (différent)

FAPSHI_API_USER=             ← depuis votre dashboard Fapshi
FAPSHI_API_KEY=              ← depuis votre dashboard Fapshi

CINETPAY_API_KEY=            ← depuis votre dashboard CinetPay
CINETPAY_SITE_ID=            ← depuis votre dashboard CinetPay

STRIPE_SECRET_KEY=           ← sk_live_xxx depuis dashboard Stripe
STRIPE_WEBHOOK_SECRET=       ← whsec_xxx (voir Étape 6)
LOG_LEVEL=info
```

> **Astuce Railway** : utilisez `${{mmm-postgres.DATABASE_URL}}` pour
> référencer automatiquement l'URL de la base PostgreSQL du même projet.

### 3.3 Commande de démarrage

Dans Railway → service backend → **Settings → Deploy** :

- **Build Command** : `npm ci && npx prisma generate && npx prisma migrate deploy`
- **Start Command** : `node src/index.js`

### 3.4 Seed (première fois seulement)

Après le premier déploiement, dans Railway → service backend → **Shell** :

```bash
node src/utils/seed.js
```

Ou via Railway CLI :
```bash
railway run --service mmm-backend node src/utils/seed.js
```

---

## Étape 4 — Déployer le Frontend

### 4.1 Nouveau service

1. **+ New Service → GitHub Repo** (même repo)
2. **Root Directory** : `frontend`

### 4.2 Variables d'environnement du frontend

```
NEXT_PUBLIC_API_URL=https://BACKEND_URL.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://BACKEND_URL.railway.app
NEXT_PUBLIC_FLW_PUBLIC_KEY=unused
```

> Remplacez `BACKEND_URL.railway.app` par l'URL générée par Railway pour votre service backend.

### 4.3 Commandes

- **Build Command** : `npm ci && npm run build`
- **Start Command** : `npm start`

### 4.4 Retour dans le backend

Une fois le frontend déployé, mettez à jour dans le service backend :
```
FRONTEND_URL=https://VOTRE_FRONTEND.railway.app
```

Puis redéployez le backend.

---

## Étape 5 — Domaines personnalisés (optionnel)

Dans Railway → service → onglet **Settings → Domains** :

1. **Generate Domain** pour obtenir un `.railway.app` gratuit
2. Ou **Custom Domain** → ajoutez votre domaine + un CNAME chez votre registrar

---

## Étape 6 — Configuration des webhooks de paiement

### Fapshi

1. Connectez-vous sur https://fapshi.com/dashboard
2. **Settings → Webhook URL** :
   ```
   https://VOTRE_BACKEND.railway.app/api/payments/webhook/fapshi
   ```
3. Activez les notifications de paiement

### CinetPay

1. Connectez-vous sur https://cinetpay.com → Dashboard
2. **Paramètres → Notifications → Notify URL** :
   ```
   https://VOTRE_BACKEND.railway.app/api/payments/webhook/cinetpay
   ```
3. **Return URL** (redirection après paiement) :
   ```
   https://VOTRE_FRONTEND.railway.app/vote/callback
   ```

### Stripe

1. Connectez-vous sur https://dashboard.stripe.com
2. **Developers → Webhooks → Add endpoint** :
   ```
   https://VOTRE_BACKEND.railway.app/api/payments/webhook/stripe
   ```
3. Événements à écouter : `checkout.session.completed`
4. Copiez le **Signing secret** (`whsec_...`) → variable `STRIPE_WEBHOOK_SECRET` dans Railway

---

## Étape 7 — Vérification finale

```bash
# Installer Railway CLI
npm install -g @railway/cli
railway login

# Vérifier les logs backend
railway logs --service mmm-backend

# Health check
curl https://VOTRE_BACKEND.railway.app/health

# Test API
curl https://VOTRE_BACKEND.railway.app/api/ranking/stats
```

---

## 🔧 Mise à jour du projet

Avec Railway, chaque `git push` sur la branche principale déclenche automatiquement un redéploiement.

```bash
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
# → Railway redéploie automatiquement ✅
```

---

## 💰 Coûts Railway

| Plan | Prix | Ressources |
|------|------|-----------|
| Hobby (gratuit) | 0$/mois | 512 MB RAM, 1 GB DB, 5$/mois de crédit offert |
| Pro | 20$/mois | RAM illimitée, base illimitée |

Pour commencer, le plan Hobby suffit largement.

---

## 🐳 Alternative : Docker Compose sur VPS

Si vous préférez un VPS (DigitalOcean, Hetzner, OVH...) :

```bash
# Sur votre VPS Ubuntu
git clone https://github.com/VOTRE_REPO/reines-du-meta.git
cd reines-du-meta
cp .env.example .env
nano .env  # remplir toutes les variables

docker-compose up -d --build
docker exec mmm_backend node src/utils/seed.js

# HTTPS avec Certbot + Nginx
apt install -y nginx certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.com
```

Voir `config/nginx.conf` pour la configuration Nginx complète.

---

## 🔐 Checklist sécurité production

- [ ] `JWT_SECRET` et `JWT_REFRESH_SECRET` générés avec `openssl rand -hex 32`
- [ ] `NODE_ENV=production` dans le backend
- [ ] URLs de webhook configurées sur Fapshi, CinetPay, Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` renseigné après création du webhook Stripe
- [ ] `DATABASE_URL` pointe vers la base Railway (ou VPS)
- [ ] `FRONTEND_URL` correctement défini dans le backend (pour CORS)
- [ ] Domaines personnalisés configurés (optionnel)

---

## 📞 Comptes à créer avant de déployer

| Service | URL | Usage |
|---------|-----|-------|
| Railway | https://railway.app | Hébergement |
| Fapshi | https://fapshi.com | Mobile Money Cameroun |
| CinetPay | https://cinetpay.com | Mobile Money Afrique |
| Stripe | https://stripe.com | Carte internationale |
