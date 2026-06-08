# 🏠 Habynex — Agence Immobilière IA · Cameroun

> La première agence immobilière augmentée par l'intelligence artificielle au Cameroun.

## Stack technique
- **Next.js 14** (App Router, SSR/SSG, SEO)
- **Supabase** (PostgreSQL + Auth + Realtime + Storage)
- **Claude API** (IA centrale)
- **Campay** (MTN + Orange Money)
- **OpenStreetMap + Leaflet** (cartes)
- **Tailwind CSS** (style Airbnb)
- **Zustand** (state management)

## Installation

```bash
# 1. Extraire et entrer dans le dossier
cd habynex-next

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.local .env.local.bak
# Remplir les 4 valeurs obligatoires dans .env.local :
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY

# 4. Initialiser la base de données Supabase
# Dans l'éditeur SQL Supabase, exécuter dans l'ordre :
# 1. habynex_01_cleanup.sql
# 2. habynex_02_schema.sql
# 3. habynex_03_migration_outcome.sql
# 4. habynex_data_exemple.sql (optionnel — données de test)

# 5. Lancer en développement
npm run dev
# → http://localhost:3000
```

## Structure du projet

```
src/
├── app/
│   ├── (auth)/           # Connexion, Inscription
│   ├── (public)/         # Pages publiques
│   │   ├── page.tsx      # Accueil
│   │   ├── rechercher/   # Recherche
│   │   ├── bien/[slug]/  # Détail annonce
│   │   ├── messages/     # Messagerie IA
│   │   ├── favoris/      # Favoris + suivi visites
│   │   ├── profil/       # Profil utilisateur
│   │   ├── onboarding/   # Config critères IA (après inscription)
│   │   ├── devenir-agent/# Candidature agent
│   │   ├── agent-dashboard/ # Dashboard agent terrain
│   │   ├── quartier/[slug]/ # Pages SEO quartiers
│   │   └── blog/         # Blog SEO
│   └── api/              # API Routes
├── components/
│   ├── layout/           # Navbar, BottomNav, Footer
│   ├── listing/          # ListingCard, Detail, Blocs
│   ├── search/           # SearchPage
│   ├── messaging/        # Chat IA
│   ├── booking/          # Réservation visite
│   ├── agent/            # Dashboard agent + candidature
│   ├── auth/             # Login, Register, Onboarding
│   ├── profile/          # Page profil
│   └── ui/               # PWA Banner, Notif toast
├── hooks/                # useAuth, useListings, useRealtime
├── stores/               # Zustand auth + listings
├── lib/                  # Supabase, AI, Campay, utils
└── types/                # Types TypeScript
```

## Fonctionnalités clés

### Front public
- ✅ Page accueil style Airbnb (4 blocs défilants)
- ✅ Barre de recherche avec types + modalités + icônes
- ✅ Onboarding IA (collecte critères après inscription)
- ✅ Messagerie temps réel avec IA (escalade admin auto)
- ✅ Réservation visite (Campay MTN/Orange)
- ✅ Parrainage (5 amis = 1 visite gratuite)
- ✅ PWA installable (banner Airbnb style)
- ✅ Notifications push (permission toast après inscription)
- ✅ Dark mode

### Agent terrain
- ✅ Dashboard missions (à venir / terminées)
- ✅ Boutons **Succès** / **Échec** après visite
- ✅ Sélection du bien choisi (si visite multi-biens)
- ✅ Auto-archivage annonce après succès confirmé
- ✅ Notification admin pour créer la commission

### Client (côté favoris)
- ✅ Confirmation après visite (J'ai trouvé / Pas concluant)
- ✅ Double confirmation agent + client → commission calculée
- ✅ Suivi de toutes les visites réservées

### SEO
- ✅ SSR/SSG sur toutes les pages annonces
- ✅ Sitemap XML dynamique
- ✅ Schema.org (RealEstateListing, BreadcrumbList)
- ✅ Pages SEO quartiers (Simbock, Jouvence, Biyem-Assi, TKC)
- ✅ Métadonnées Open Graph + Twitter Cards

## SQL à exécuter dans Supabase

| Ordre | Fichier | Description |
|-------|---------|-------------|
| 1 | `habynex_01_cleanup.sql` | Nettoyer l'ancien schéma |
| 1b | `habynex_01b_cleanup_fix.sql` | Si des fonctions résistent |
| 2 | `habynex_02_schema.sql` | Nouveau schéma complet |
| 3 | `habynex_03_migration_outcome.sql` | Colonnes outcome visites |
| 4 | `habynex_data_exemple.sql` | Données de test (6 annonces) |

## Variables d'environnement

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# IA Claude (obligatoire)
ANTHROPIC_API_KEY=

# Paiement Campay (optionnel en dev)
CAMPAY_USERNAME=
CAMPAY_PASSWORD=
CAMPAY_BASE_URL=https://campay.net/api

# Push notifications (optionnel)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CONTACT=mailto:contact.habynex@gmail.com

# Cron Vercel
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Contact
📧 contact.habynex@gmail.com  
📱 +237 654 888 084  
📍 Yaoundé, Cameroun
