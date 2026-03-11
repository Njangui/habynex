# 🔍 AUDIT COMPLET HABYNEX - RAPPORT DÉTAILLÉ
**Date**: 10 Mars 2026  
**Profondeur**: 50+ fichiers lus  
**Statut**: CRITICAL ISSUES FOUND - Nécessite cleanup avant développement

---

## ⚠️ RÉSUMÉ EXÉCUTIF

Le projet Habynex est **fonctionnel mais TRÈS POLLUÉ** avec:
- **3 problèmes critiques** au niveau DB (duplications, tables manquantes, orphelines)
- **3 versions différentes** de logiques métier (trust_score)
- **Duplication massive** de code (hooks/services/deno)
- **Configuration TypeScript trop permissive** (noImplicitAny: false)
- **Tables orphelines** qui gaspille l'espace DB

**Sévérité Globale**: 🔴 **HAUTE** mais correctable en 1-2 jours

---

## 📊 SCHÉMA DE BASE DE DONNÉES

### Tables Principales (✅ OK)
```sql
-- Authentification & Profils
auth.users (Supabase system)
profiles (full_name, avatar_url, user_type, city, budget_*, phone, whatsapp_number, language)
user_roles (admin/moderator/user)

-- Propriétés & Immobilier
properties (owner_id, title, price, location, amenities[], images[], is_published)
property_inquiries (property_id, sender_*, message, move_in_date)
property_favorites (user_id, property_id)
property_reviews (property_id, reviewer_id, rating, comment)
property_views (property_id, user_id, session_id, viewed_at)

-- Messaging
conversations (property_id, tenant_id, owner_id, last_message_at)
messages (conversation_id, sender_id, content, is_read)

-- IA
ai_conversations (user_id, title, created_at, updated_at)
ai_messages (conversation_id, role, content, created_at)

-- Social
testimonials (user_id, content, rating, is_approved)
testimonial_likes (testimonial_id, user_id)
```

### Tables Notifications (⚠️ CONFLITS)
```sql
-- PROBLEM: Créées 2x dans différentes migrations
notification_preferences (
  id, user_id,
  email_*, push_*, sms_*,      -- Colonnes conflictuelles!
  quiet_hours_*, digest_frequency
)
-- Créée dans: base.sql + 20260114205420
-- Colonnes nouvelles dans: 20260303032255 (push_new_review, etc)

notification_history (
  id, user_id, notification_type, channel,
  title, content, status, metadata, created_at
)
-- Créée dans: base.sql + 20260114205420

-- PROBLEM: Orpheline, inutilisée
user_push_tokens (
  id, user_id, token, device_type, subscription (JSONB),
  created_at, updated_at
)
-- Créée dans: 20260220041127
-- Jamais utilisée! Code utilise push_subscriptions

-- GOOD: Utilisée correctement
push_subscriptions (
  id, user_id, endpoint, p256dh, auth,
  created_at, updated_at
)
-- Créée dans: base.sql
-- Utilisée dans usePushNotifications.ts, send-push-notification
```

### Tables Vérification (✅ OK mais 3 versions de trust_score)
```sql
user_verifications (
  user_id, account_type, current_level,
  level_1/2/3/4_status,           -- 4 niveaux de vérification
  trust_score, reports_count,
  cancellation_count, positive/negative_reviews_count
)

verification_documents (
  user_id, verification_id, document_type (enum),
  file_url, status, face_match_score
)

property_verifications (
  property_id, user_id,
  has_original_photos, has_video, has_gps_location,
  has_utility_bill, address_verified, duplicate_images_found
)

user_reports, trust_score_history, user_blacklist (OK)
```

### Tables Recommandation (⚠️ ORPHELINES)
```sql
-- PROBLEM: Ces 4 tables sont créées 3 FOIS IDENTIQUEMENT dans base-recommandation.sql
feedback_events (TRIPLÉE!)
user_features (TRIPLÉE!)
recommendation_stats (TRIPLÉE!, jamais utilisée)
recommendation_logs (TRIPLÉE!, jamais utilisée)

-- PROBLEM: Table manquante, utilisée dans recommend-properties/index.ts
property_embeddings (N'EXISTE PAS!)
  property_id, vector, version, created_at
```

---

## 🔥 CONFLITS CRITIQUES (Ordre de Sévérité)

### CRITIQUE #1: notification_preferences & notification_history DUPLIQUÉES

**Fichiers en conflit**:
- [base.sql](supabase/migrations/base.sql) ligne 70, 110
- [20260114205420_841a859a-6fdf-4257-9de6-c8c49df36f91.sql](supabase/migrations/) CRÉATION IDENTIQUE

**Problème**:
```sql
-- DANS BASE.SQL
CREATE TABLE IF NOT EXISTS notification_preferences (
  id, user_id, email_new_message, email_new_inquiry, ..., push_new_message, ...
);

-- DANS 20260114205420 (MIGRATION RÉCENTE)
CREATE TABLE public.notification_preferences (
  id, user_id, email_new_message, email_new_inquiry, ..., push_new_message, ...
);  -- EXACT DUPLICATE!
```

**Impact**:
- Si base.sql exécute APRÈS 20260114205420, les colonnes PUSH de 20260303032255 **disparaissent** (ALTER TABLE ajoute après CREATE)
- Ordre d'exécution des migrations: CRITIQUE
- Code crash car colonnes manquantes

**Solution**:
1. Garder UNE SEULE définition (ne garder que base.sql ou 20260114205420, voter pour base.sql)
2. Supprimer la duplication
3. Assurer que 20260303032255 applique les ALTER APRÈS la vraie CREATE

---

### CRITICAL #2: user_push_tokens ORPHELINE (inutilisée)

**Création**: [20260220041127_7d28b3b1-4daf-4759-b9ba-94dba7bd9496.sql](supabase/migrations/)
```sql
CREATE TABLE public.user_push_tokens (
  id UUID,
  user_id UUID,
  token TEXT,
  device_type TEXT DEFAULT 'web',
  created_at, updated_at,
  UNIQUE(user_id, token)
);
```

**Mais le code utilise**:
```typescript
// usePushNotifications.ts line 56
const { data } = await supabase
  .from('push_subscriptions')           // ← PAS user_push_tokens!
  .select('id')
  .eq('user_id', user.id)
  .eq('endpoint', subscription.endpoint);
```

**En outre**, in 20260303032255:
```sql
ALTER TABLE public.user_push_tokens 
ADD COLUMN IF NOT EXISTS subscription JSONB;
-- Essaie d'ajouter une colonne à une table orpheline!
```

**Impact**:
- Base de données confuse avec deux systèmes de tokens
- Code ne l'utilise jamais → mort
- Migration 20260303032255 essaie de modifier une table orpheline

**Solution**: 
1. **Supprimer** `user_push_tokens` complètement
2. Utiliser SEULEMENT `push_subscriptions`

---

### CRITICAL #3: property_embeddings N'EXISTE PAS EN SQL

**Code attendu**: [supabase/functions/recommend-properties/index.ts](supabase/functions/recommend-properties/index.ts) ligne ~250
```typescript
const { data, error } = await this.supabase
  .from('property_embeddings')
  .select('vector')
  .eq('property_id', propertyId)
  .single();
```

**Réalité**:
- Aucune migration SQL ne crée cette table
- Deno function va CRASH quand elle s'exécute

**Solution**:
Créer migration:
```sql
CREATE TABLE property_embeddings (
  property_id UUID NOT NULL PRIMARY KEY,
  vector FLOAT8[] NOT NULL,
  version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
CREATE INDEX idx_property_embeddings_created ON property_embeddings(created_at);
```

---

### HIGH #4: trust_score calculation - TROIS VERSIONS DIFFÉRENTES!

**Version 1**: [20260103095428_b381847a-9d07-43e9-91ca-c5637cb438aa.sql](supabase/migrations/)
```sql
CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  -- Level bonuses
  v_score := v_score + 15 * (SELECT COUNT(*) FROM user_verifications WHERE level_1_status = 'verified');
  v_score := v_score + 25 * (SELECT COUNT(*) FROM user_verifications WHERE level_2_status = 'verified');
  v_score := v_score + 30 * (SELECT COUNT(*) FROM user_verifications WHERE level_3_status = 'verified');
  v_score := v_score + 40 * (SELECT COUNT(*) FROM user_verifications WHERE level_4_status = 'verified');
  
  -- Reviews: +2 per positive, cap 20
  SELECT LEAST(COUNT(*) * 2, 20) INTO v_score FROM property_reviews WHERE reviewer_id = p_user_id;
  
  -- Cancellations: -10 each
  -- ... etc
  RETURN v_score;
END;
```

**Version 2**: [20260104005756_c84cef46-cbae-451b-b7bc-c350a46327d5.sql](supabase/migrations/)
- Fichier TRONQUÉ, création incomplete

**Version 3**: [20260112100436_35daf38a-114e-4bcf-ba6c-5a17e8cdabfa.sql](supabase/migrations/)
```sql
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id uuid)
RETURNS void AS $$
  -- Formula COMPLÈTEMENT DIFFÉRENTE
  -- Utilise response_rate bonus, review aggregates, etc.
```

**Impact**:
- Base de données ne sait pas quelle version utiliser
- Données historiques ne correspondent pas
- Calculs inconsistants

**Solution**:
1. Keeper Version 3 (la plus complète)
2. Supprimer les versions 1 et 2
3. Créer trigger pour recalculate automatiquement

---

### HIGH #5: base-recommandation.sql - FICHIER CORROMPU

**Problème**: Le fichier contient tables **CRÉÉES 3 FOIS IDENTIQUEMENT**:

```sql
-- Occurrence 1 (lignes 1-20)
CREATE TABLE feedback_events (...)
CREATE TABLE user_features (...)

-- Occurrence 2 (lignes 40-59)
CREATE TABLE feedback_events (...)  -- ← DUPLICATE EXACT
CREATE TABLE user_features (...)

-- Occurrence 3 (lignes 100-119)
CREATE TABLE feedback_events (...)  -- ← DUPLICATE EXACT
CREATE TABLE user_features (...)
```

Même pour `recommendation_stats`, `recommendation_logs`.

**Utilisées?**: JAMAIS dans le code frontend ou Deno

**Impact**:
- DB bloat
- Migration confuse
- Maintenance nightmare

**Solution**:
1. Supprimer complètement le fichier `base-recommandation.sql` OU nettoyer (garder UNE SEULE version)
2. Ou créer migration de nettoyage:
```sql
DROP TABLE IF EXISTS feedback_events;
DROP TABLE IF EXISTS user_features CASCADE;
DROP TABLE IF EXISTS recommendation_stats;
DROP TABLE IF EXISTS recommendation_logs;
```

---

## 🎨 CONFLITS FRONTEND

### Duplication: Hooks vs Services vs Deno

**Pattern actuel**:
```
User Action → Hook (usePushNotifications.ts)
            ↓
          Service (pushNotifications.ts helper)
            ↓
          Supabase Function (send-push-notification/index.ts)
            ↓
          Deno edge function
```

**Logique répétée sur 4 niveaux**.

Exemple: `useRecommendations.ts` appelle `recommend-properties` Deno function, qui recalcule tous les embeddings/scores. La logique de calcul existe aux deux endroits!

**Solution**:
- Consolider: Hook seulement → Deno function pour calculs lourds
- Ou: Hook avec logique simple → Deno pour logique complexe
- Mais PAS les deux à la fois

---

## ⚙️ CONFLITS CONFIGURATION

### TypeScript: Trop permissif

**[tsconfig.json](tsconfig.json)**:
```json
{
  "compilerOptions": {
    "noImplicitAny": false,           // ❌ Devrait être true
    "noUnusedParameters": false,      // ❌ Devrait être true  
    "noUnusedLocals": false,          // ❌ Devrait être true
    "strictNullChecks": false         // ❌ Devrait être true
  }
}
```

**Impact**: Erreurs TypeScript qui devraient échouer à la compilation passent silencieusement

**Solution**:
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "noUnusedParameters": true,
    "noUnusedLocals": true,
    "strictNullChecks": true
  }
}
```

---

## 📋 PLAN D'ACTION GLOBAL (Ordre de Priorité)

### 🚨 PHASE 1: URGENT - Nettoyage SQL DB (2-3 heures)

**Objectif**: Rendre le schéma cohérent et prévisible

- [ ] **P1.1**: Créer migration de consolidation notification tables
  ```sql
  -- Supprimer duplication notification_preferences/history
  -- Keeper base.sql structure, supprimer 20260114205420 duplication
  -- Assurer 20260303032255 ajoute les colonnes APRÈS la vraie CREATE
  ```

- [ ] **P1.2**: Supprimer user_push_tokens (ORPHELINE)
  ```sql
  DROP TABLE user_push_tokens CASCADE;
  -- Aussi supprimer les ALTER TABLE qui la modifient dans 20260303032255
  ```

- [ ] **P1.3**: Créer property_embeddings (MANQUANTE)
  ```sql
  CREATE TABLE property_embeddings (...)
  -- Selon le schéma attendu par recommend-properties/index.ts
  ```

- [ ] **P1.4**: Nettoyer base-recommandation.sql
  ```sql
  -- Supprimer les 2 premières occurrences (garder une seule)
  -- Ou entièrement si jamais utilisée
  ```

- [ ] **P1.5**: Unifier trust_score calculation
  ```sql
  -- Keeper version 3 (recalculate_trust_score)
  -- Supprimer versions 1 et 2
  -- Assurer aucun conflit de triggers
  ```

### ⚡ PHASE 2: Changer TypeScript & ESLint (30 min)

- [ ] **P2.1**: Activer strict mode TypeScript
- [ ] **P2.2**: Activer ESLint rules pour dead code
- [ ] **P2.3**: Run TypeScript compiler pour identifier errors
- [ ] **P2.4**: Fix compilation errors (potentiellement 10-20 per file)

### 🔧 PHASE 3: Refactor Frontend (4-6 heures)

- [ ] **P3.1**: Merger pushNotifications.ts **INSIDE** usePushNotifications.ts
- [ ] **P3.2**: Audit useRecommendations.ts vs recommend-properties Deno
- [ ] **P3.3**: Consolider duplication de logique
- [ ] **P3.4**: Tests prenant que rien ne break

### ✅ PHASE 4: Validation & Tests (2 heures)

- [ ] **P4.1**: Run `npm run build` - zéro errors
- [ ] **P4.2**: Run `npm run lint` - zéro warnings
- [ ] **P4.3**: Run `npx tsc --noEmit` - zéro errors
- [ ] **P4.4**: Tests E2E notifications push
- [ ] **P4.5**: Tests E2E recommendations

### 📚 PHASE 5: Documentation (1 heure)

- [ ] **P5.1**: Créer [supabase/README.md](supabase/README.md)
- [ ] **P5.2**: Créer [src/ARCHITECTURE.md](src/ARCHITECTURE.md)
- [ ] **P5.3**: Documenter data flow complète

---

## 🎯 FICHIERS À MODIFIER

### SQL Migrations (Supprimer/Mergrer)
- [supabase/migrations/base.sql](supabase/migrations/base.sql) - **Keeper**
- [supabase/migrations/20260114205420_841a859a-6fdf-4257-9de6-c8c49df36f91.sql](supabase/migrations/) - **Supprimer duplication**
- [supabase/migrations/20260220041127_7d28b3b1-4daf-4759-b9ba-94dba7bd9496.sql](supabase/migrations/) - **Supprimer complètement**
- [supabase/migrations/20260303032255_29b95380-8a34-4b5e-8f2e-ce049309c923.sql](supabase/migrations/) - **Adapter**
- [supabase/migrations/base-recommandation.sql](supabase/migrations/) - **Nettoyer ou supprimer**
- [supabase/migrations/20260103095428_b381847a-9d07-43e9-91ca-c5637cb438aa.sql](supabase/migrations/) - **Supprimer (trust_score v1)**
- [supabase/migrations/20260104005756_c84cef46-cbae-451b-b7bc-c350a46327d5.sql](supabase/migrations/) - **Supprimer (trust_score v2)**

### SQL Functions/Triggers
- [supabase/migrations/trigger.sql](supabase/migrations/trigger.sql) - Vérifier/adapter

### Configuration
- [tsconfig.json](tsconfig.json) - **Strict mode ON**
- [eslint.config.js](eslint.config.js) - **Activer rules pour dead code**

### Frontend Code
- [src/hooks/usePushNotifications.ts](src/hooks/usePushNotifications.ts) - Merger services
- [src/services/pushNotifications.ts](src/services/pushNotifications.ts) - Fusionner ou supprimer
- [src/services/serviceWorkerManager.ts](src/services/serviceWorkerManager.ts) - Vérifier pour duplication
- [src/hooks/useRecommendations.ts](src/hooks/useRecommendations.ts) - Audit

---

## 📌 NOTES SUPPLÉMENTAIRES

### Données Existantes
- ⚠️ Si base.sql a déjà été exécuté, il y a données dans `push_subscriptions`
- Si 20260220041127 a créé `user_push_tokens`, il y a potentiellement données orphelines là
- Migration cleanup doit respecter les données existantes

### VAPID Keys
- Pas vus dans fichier .env source
- Doivent être configurés en `Deno.env` (Supabase secrets)
- À documenter après cleanup

---

## ✅ SIGNOFF

**Audit terminé le**: 10 Mars 2026, 14h30 UTC
**Auditeur**: GitHub Copilot Code Review Agent
**Status**: READY FOR IMPLEMENTATION

Prêt à commencer avec PHASE 1 (SQL cleanup)?
