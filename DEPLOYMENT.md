# 🚀 DEPLOYMENT.md — Guide de déploiement complet

## Option A — VPS (Ubuntu 22.04) avec PM2 + Nginx

### 1. Setup serveur initial

```bash
# Connexion SSH
ssh root@VOTRE_IP

# Mise à jour système
apt update && apt upgrade -y

# Utilitaires
apt install -y curl git wget unzip build-essential

# Firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### 2. Installer Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x.x
npm -v    # 10.x.x
```

### 3. Installer PostgreSQL 16

```bash
apt install -y postgresql postgresql-contrib

# Démarrer PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Créer utilisateur et base de données
sudo -u postgres psql << EOF
CREATE USER mmm_user WITH PASSWORD 'votre_mot_de_passe_fort';
CREATE DATABASE metamissmaster OWNER mmm_user;
GRANT ALL PRIVILEGES ON DATABASE metamissmaster TO mmm_user;
EOF
```

### 4. Installer PM2

```bash
npm install -g pm2
pm2 startup systemd
# Copier-coller la commande affichée par pm2 startup
```

### 5. Installer Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 6. Déployer le code

```bash
# Créer utilisateur applicatif (bonne pratique)
useradd -m -s /bin/bash mmm
su - mmm

# Cloner le projet
git clone https://github.com/VOTRE_REPO/meta-miss-master.git
cd meta-miss-master

# Variables d'environnement
cp .env.example backend/.env
nano backend/.env
# → Remplir DATABASE_URL, JWT_SECRET, FLW_SECRET_KEY, etc.

cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
# → Remplir NEXT_PUBLIC_API_URL=https://votre-domaine.com/api
# → NEXT_PUBLIC_SOCKET_URL=https://votre-domaine.com

# Installer les dépendances backend
cd backend
npm ci --only=production
npx prisma generate
npx prisma migrate deploy
node src/utils/seed.js   # Premier démarrage uniquement

# Builder le frontend
cd ../frontend
npm ci
npm run build
```

### 7. Configurer PM2

```bash
# Depuis la racine du projet
cd ~/meta-miss-master
pm2 start ecosystem.config.js --env production
pm2 save
pm2 list   # Vérifier que les 2 apps tournent
```

### 8. Configurer Nginx

```bash
# En tant que root
cp ~/meta-miss-master/config/nginx.conf /etc/nginx/sites-available/metamissmaster
ln -s /etc/nginx/sites-available/metamissmaster /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Éditer le fichier et remplacer yourdomain.com par votre vrai domaine
nano /etc/nginx/sites-available/metamissmaster

# Tester la config
nginx -t
systemctl reload nginx
```

### 9. SSL avec Let's Encrypt (HTTPS)

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir le certificat (remplacer yourdomain.com)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Renouvellement automatique (déjà configuré par certbot)
systemctl status certbot.timer
```

### 10. Vérification finale

```bash
# Vérifier les services
pm2 list
systemctl status nginx
systemctl status postgresql

# Tester l'API
curl https://votre-domaine.com/health

# Logs en temps réel
pm2 logs
```

---

## Option B — Docker Compose (VPS ou serveur dédié)

```bash
# Sur le serveur
git clone https://github.com/VOTRE_REPO/meta-miss-master.git
cd meta-miss-master

cp .env.example .env
nano .env   # Remplir TOUTES les variables

# Build et démarrage
docker-compose up -d --build

# Seed (première fois)
docker exec mmm_backend node src/utils/seed.js

# Vérifier
docker-compose ps
docker-compose logs -f
```

Pour le SSL avec Docker, utilisez Traefik ou un reverse proxy externe.

---

## Option C — Render.com (cloud gratuit/payant)

### Backend (Web Service)
1. Nouveau service → **Web Service** → connecter votre repo GitHub
2. Root directory : `backend`
3. Build Command : `npm ci && npx prisma generate && npx prisma migrate deploy`
4. Start Command : `node src/index.js`
5. Variables d'environnement : ajouter toutes les variables de `backend/.env.example`

### Frontend (Static Site ou Web Service)
1. Nouveau service → **Web Service**
2. Root directory : `frontend`
3. Build Command : `npm ci && npm run build`
4. Start Command : `npm start`
5. Variables d'environnement : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_FLW_PUBLIC_KEY`

### Base de données
1. Nouveau service → **PostgreSQL**
2. Copier l'**Internal Database URL** dans `DATABASE_URL` du backend

---

## Option D — Vercel (frontend) + Railway (backend + DB)

### Railway — Backend + PostgreSQL
```bash
npm install -g @railway/cli
railway login
railway new
railway add postgresql

# Déployer le backend
cd backend
railway up
```

Ajouter les variables dans le dashboard Railway.

### Vercel — Frontend
```bash
npm install -g vercel
cd frontend
vercel
# Suivre les instructions
# Ajouter les env vars dans Settings → Environment Variables
```

---

## Configuration webhook Flutterwave en production

1. Connectez-vous à https://dashboard.flutterwave.com
2. Allez dans **Settings → Webhooks**
3. Ajoutez l'URL : `https://votre-domaine.com/api/payments/webhook`
4. Dans le champ **Secret Hash**, entrez la valeur de `FLW_SECRET_HASH` de votre `.env`
5. Cochez l'événement : **charge.completed**
6. Sauvegardez

**Test du webhook :**
```bash
# Flutterwave Dashboard → Settings → Webhooks → Send Test Event
# Vérifier dans les logs PM2 :
pm2 logs mmm-backend | grep "Webhook"
```

---

## Mise à jour du projet

```bash
cd ~/meta-miss-master
git pull origin main

# Backend
cd backend
npm ci --only=production
npx prisma migrate deploy
pm2 restart mmm-backend

# Frontend
cd ../frontend
npm ci
npm run build
pm2 restart mmm-frontend
```

---

## Monitoring & Logs

```bash
# Logs PM2
pm2 logs                    # tous les logs
pm2 logs mmm-backend        # backend uniquement
pm2 logs mmm-frontend       # frontend uniquement

# Status
pm2 monit                   # Dashboard temps réel

# Fichiers de logs
tail -f ~/meta-miss-master/logs/backend-error.log
tail -f ~/meta-miss-master/logs/combined.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Sécurité checklist production

- [ ] Toutes les variables `.env` renseignées avec des valeurs fortes
- [ ] `JWT_SECRET` généré avec `openssl rand -hex 32`
- [ ] PostgreSQL accessible uniquement en local (pas de port 5432 ouvert)
- [ ] Firewall activé (ufw)
- [ ] HTTPS activé (Let's Encrypt)
- [ ] `NODE_ENV=production` dans le backend
- [ ] `FLW_SECRET_HASH` configuré et vérifié côté webhook
- [ ] Logs activés et surveillés
- [ ] Backups PostgreSQL configurés (`pg_dump`)

### Backup automatique PostgreSQL

```bash
# Ajouter au crontab (crontab -e)
0 2 * * * pg_dump -U mmm_user metamissmaster | gzip > /backups/mmm_$(date +\%Y\%m\%d).sql.gz
```
