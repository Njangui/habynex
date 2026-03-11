# 📋 DOCUMENTATION COMPLÈTE - HABYNEX AUDIT & PLAN D'ACTION

**Date Audit**: 10 Mars 2026  
**Auditeur**: GitHub Copilot (Agent Review Complet)  
**Fichiers Analysés**: 50+ (27 migrations SQL + 10 Deno Functions + Config)  
**Status**: 🔴 CRITICAL ISSUES FOUND - Prêt pour PHASE D'EXÉCUTION

---

# 📊 PART 1: DÉCOUVERTES COMPLÈTES

## 🎯 RÉSUMÉ EXÉCUTIF

Le projet **Habynex** est une **application immobilière moderne** (Vite+React+TypeScript+Supabase) avec un **système de notifications push**, **moteur de recommandations**, et **vérification d'utilisateurs complexe**.

### État Actuel
- ✅ **Fonctionnel en production** (toutes les features principales marchent)
- 🟡 **Architecture cohérente** (Vite+Supabase+Deno, bien structuré)
- 🔴 **Très pollué** (duplications massives, tables orphelines, conflits non résolus)

### Problèmes Critiques Identifiés
1. **5 Conflits CRITIQUES** au niveau Base de Données
2. **5 Conflits HIGH** niveau logique métier
3. **10+ Tables Orphelines** (jamais utilisées)
4. **Duplication Code** (Hooks + Services + Deno = logique 4x)
5. **Configuration TypeScript** Trop permissive

---

## 🔴 5 CONFLITS CRITIQUES

### CRITICAL #1: notification_preferences DUPLIQUÉE

**Fichiers impliqués**:
- [base.sql](supabase/migrations/base.sql) ligne 70 - CREATE TABLE notification_preferences
- [20260114205420](supabase/migrations/20260114205420_841a859a-a5ad-44ca-b7b5-9f0a6fbd989b.sql) - IDENTIQUE

**Problème Exact**:
```sql
-- DANS base.sql (L70)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_new_message boolean, email_new_inquiry boolean, ...
  push_new_message boolean, ...
  created_at timestamp, updated_at timestamp
);

-- DANS 20260114205420 (CRÉÉE IDENTIQUEMENT!)
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE, ...
  -- MÊMES COLONNES!
);

-- PUIS DANS 20260303032255
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS push_new_review BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_high_views BOOLEAN DEFAULT true,
...
```

**Impact Critique**:
- Si `base.sql` exécute **APRÈS** `20260114205420`, la table est **DROP puis RECREATE** sans les colonnes push_*
- Les colonnes nouvelles de `20260303` **N'EXISTENT PLUS**
- Code crash quand il essaie d'accéder à `push_new_review`, `push_high_views`, etc.

**Utilisé par**:
- [check-high-views/index.ts](supabase/functions/check-high-views/index.ts) ligne ~90 - accède `push_high_views`
- [property-matching/index.ts](supabase/functions/property-matching/index.ts) ligne ~50 - accède `push_recommendations`
- [reengagement/index.ts](supabase/functions/reengagement/index.ts) ligne ~100 - accède `push_marketing`

**Solution Requise**:
```sql
-- OPTION 1: Supprimer 20260114205420 duplication
-- OPTION 2: Supprimer notification_preferences de base.sql, garder 20260114205420
-- OPTION 3: Créer migration 202603xx_consolidate_notification_preferences.sql
DROP TABLE IF EXISTS notification_preferences CASCADE;
CREATE TABLE notification_preferences (... avec TOUTES les colonnes...);
```

---

### CRITICAL #2: notification_history DUPLIQUÉE

**Fichiers impliqués**:
- [base.sql](supabase/migrations/base.sql) ligne 110
- [20260114205420](supabase/migrations/20260114205420_841a859a-a5ad-44ca-b7b5-9f0a6fbd989b.sql)

**Problème**:
Deux CREATE TABLE IDENTIQUES pour notification_history

**Impact**:
- Moins grave que C1 (utilise `CREATE TABLE IF NOT EXISTS`)
- Mais CONFUND le schéma
- Code insère dans notification_history sans erreur

**Utilisé par**:
- [send-notification/index.ts](supabase/functions/send-notification/index.ts) - écriture
- [send-push-notification/index.ts](supabase/functions/send-push-notification/index.ts) - écriture
- [handle-events/index.ts](supabase/functions/handle-events/index.ts) - écriture
- [reengagement/index.ts](supabase/functions/reengagement/index.ts) - lecture

---

### CRITICAL #3: user_push_tokens ORPHELINE (INUTILISÉE)

**Fichier**:
- [20260220041127](supabase/migrations/20260220041127_7d28b3b1-4daf-4759-b9ba-94dba7bd9496.sql)

**Contenu**:
```sql
CREATE TABLE public.user_push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);
```

**Problème**:
- Table créée mais **JAMAIS UTILISÉE**
- Tout le code utilise `push_subscriptions` à la place
- [20260303032255](supabase/migrations/20260303032255_29b95380-8a34-4b5e-8f2e-ce049309c923.sql) essaie d'ALTER cette table morte:
  ```sql
  ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS subscription JSONB;
  DROP CONSTRAINT IF EXISTS user_push_tokens_user_id_token_key;
  ```

**Utilisé par Code**:
- ❌ JAMAIS utilisée

**Code utilise plutôt**:
- [usePushNotifications.ts](src/hooks/usePushNotifications.ts) ligne 56 - accède `push_subscriptions`
- [send-push-notification/index.ts](supabase/functions/send-push-notification/index.ts) ligne 80 - accède `push_subscriptions`

**Solution Requise**:
```sql
-- Créer migration 202603xx_remove_user_push_tokens.sql
DROP TABLE IF EXISTS user_push_tokens CASCADE;

-- Enlever les ALTERs de 20260303032255 qui la modifient
```

---

### CRITICAL #4: property_embeddings MANQUANTE

**Code qui l'utilise**:
- [recommend-properties/index.ts](supabase/functions/recommend-properties/index.ts) ligne ~250

**Code exact**:
```typescript
async getPropertyEmbedding(propertyId: string): Promise<number[] | null> {
  const { data, error } = await this.supabase
    .from('property_embeddings')  // ← TABLE N'EXISTE PAS!
    .select('vector')
    .eq('property_id', propertyId)
    .single();

  if (error || !data) return null;
  return data.vector;
}
```

**Impact**:
- 🔴 **CODE DENO CRASH** à runtime quand il essaie d'accéder cette table
- Feature de recommandation **NE FONCTIONNE PAS**

**Solution Requise**:
```sql
-- Créer migration 202603xx_create_property_embeddings.sql
CREATE TABLE public.property_embeddings (
  property_id UUID NOT NULL PRIMARY KEY,
  vector FLOAT8[] NOT NULL,
  version TEXT DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

CREATE INDEX idx_property_embeddings_created ON public.property_embeddings(created_at);
```

---

### CRITICAL #5: base-recommandation.sql CORROMPU

**Fichier**:
- [base-recommandation.sql](supabase/migrations/base-recommandation.sql)

**Contenu**:
Le fichier contient **4 tables créées 3 FOIS CHACUNE** identiquement:

```sql
-- OCCURRENCE 1 (lignes 1-50)
CREATE TABLE feedback_events (...)
CREATE TABLE user_features (...)
CREATE TABLE recommendation_stats (...)
CREATE TABLE recommendation_logs (...)

-- OCCURRENCE 2 (lignes 40-90) - EXACT DUPLICATE!
CREATE TABLE feedback_events (...)
CREATE TABLE user_features (...)
...

-- OCCURRENCE 3 (lignes 100-150) - EXACT DUPLICATE!
CREATE TABLE feedback_events (...)
...
```

**Impact**:
- 🔴 **DB BLOAT** massif
- Confusion dans le schéma
- Aucune de ces tables **N'EST JAMAIS UTILISÉE**

**Preuve qu'elles sont orphelines**:
- `feedback_events` - Jamais interrogée
- `user_features` - Jamais interrogée  
- `recommendation_stats` - Jamais interrogée
- `recommendation_logs` - Jamais interrogée

**Solution Requise**:
```sql
-- OPTION A: Supprimer complètement base-recommandation.sql
-- OPTION B: Nettoyer le fichier (garder 1 occurrence seulement)

-- Créer migration 202603xx_cleanup_orphaned_tables.sql
DROP TABLE IF EXISTS feedback_events CASCADE;
DROP TABLE IF EXISTS user_features CASCADE;
DROP TABLE IF EXISTS recommendation_stats CASCADE;
DROP TABLE IF EXISTS recommendation_logs CASCADE;
```

---

## 🟡 5 CONFLITS HIGH (Secondaires)

### HIGH #6: TROIS VERSIONS DE trust_score Calculation

**Version 1**: [20260103095428](supabase/migrations/20260103095428_b381847a-9d07-43e9-91ca-c5637cb438aa.sql)
```sql
CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
-- Utilise: level_1 (+15), level_2 (+25), level_3 (+30), level_4 (+40)
-- Avis: +2 max +20
-- Annulations: -10 chacune
-- Response rate: +5 si >= 90%
```

**Version 2**: [20260104005756](supabase/migrations/20260104005756_c84cef46-cbae-451b-b7bc-c350a46327d5.sql)
- Fichier TRONQUÉ / INCOMPLET

**Version 3**: [20260112100436](supabase/migrations/20260112100436_35daf38a-114e-4bcf-ba6c-5a17e8cdabfa.sql)
```sql
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id uuid)
-- Formula COMPLÈTEMENT DIFFÉRENTE:
-- level_1_status: +30
-- positive_reviews * 5 (max +20)
-- negative_reviews * -10
-- reports * -15
-- response_rate: bonus variable
```

**Problème**:
- Trois formules différentes pour le MÊME calcul
- Laquelle est active? AMBIGÜE
- Les données historiques utilisent une formule, code en utilise une autre

**Utilisé par**:
- [user_verifications](supabase/migrations/20260103095428_b381847a-9d07-43e9-91ca-c5637cb438aa.sql) table - `trust_score` column
- UI Profile pour afficher score

---

### HIGH #7: handle_new_user DEUX VERSIONS

**Version 1**: [20251227185914](supabase/migrations/20251227185914_bb85faea-61e9-4a46-a58b-9197b21ba337.sql)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (...);
  -- Pas de whatsapp_number!
```

**Version 2**: [20260116152556](supabase/migrations/20260116152556_47c82042-adfb-4714-b986-46e1261065a5.sql)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, whatsapp_number)
  VALUES (..., NEW.raw_user_meta_data ->> 'whatsapp_number');
  -- + whatsapp_number!
```

**Problème**:
- v2 overwrite v1
- Si on n'a pas whatsapp_number en raw_user_meta_data, NULL

---

### HIGH #8: DUPLICATION CODE - Hooks vs Services vs Deno

**Pattern Notification**:
```
[usePushNotifications.ts] ← Hook principal
  ↓ utilise
[pushNotifications.ts] ← Service helper
  ↓ utilise
[send-push-notification] ← Deno function
  ↓ utilise
[handle-events] ← Deno webhook
```

Logique **répétée 4 niveaux**.

**Pattern Recommandation**:
- [useRecommendations.ts](src/hooks/useRecommendations.ts) ← Frontend hook
- [recommend-properties/index.ts](supabase/functions/recommend-properties/index.ts) ← Deno function
- **Mêmes calculs d'embeddings au deux endroits**

---

### HIGH #9: TypeScript Configuration TOO PERMISSIVE

**Fichier**: [tsconfig.json](tsconfig.json)
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

**Impact**:
- Erreurs TypeScript qui auraient dû être détectées passent silencieusement
- Runtime errors au lieu de compile-time

---

### HIGH #10: ESLint Disabled

**Fichier**: [eslint.config.js](eslint.config.js)
```javascript
{
  "@typescript-eslint/no-unused-vars": "off"  // ❌ Dead code pas détecté
}
```

---

## ✅ TABLES ORPHELINES (Jamais Utilisées)

```
base-recommandation.sql (TRIPLÉE):
  - feedback_events (3x)
  - user_features (3x)
  - recommendation_stats (3x)
  - recommendation_logs (3x)

20260220041127:
  - user_push_tokens
```

**Total**: 5 tables (ou 8 si on compte les duplications)

---

## 🔧 SUPABASE FUNCTIONS (10 Total)

| # | Fonction | Purpose | Tables | Status |
|---|----------|---------|--------|--------|
| 1 | **send-push-notification** | Envoie push via Web Push API | push_subscriptions, notification_history | ✅ OK |
| 2 | **send-notification** | Envoie emails via Resend | notification_history | ✅ OK |
| 3 | **handle-events** | Webhook receiver (événements) | properties, profiles, conversations, notification_prefs, user_verifications | ✅ OK |
| 4 | **send-sms-otp** | OTP SMS via Africa's Talking | profiles | ✅ OK |
| 5 | **recommend-properties** | Moteur recommandation (embeddings) | **property_embeddings (MANQUANTE!)**, property_views, properties | 🔴 CRASH |
| 6 | **property-matching** | Match propriétés aux seekers | properties, profiles, notification_prefs | ✅ OK |
| 7 | **check-high-views** | Notify milestones de vues | properties, profiles, notification_prefs, view_milestone_notifications | ✅ OK |
| 8 | **reengagement** | Unlock utilisateurs inactifs | push_subscriptions, notification_history, notification_prefs | ✅ OK |
| 9 | **property-ai-search** | Recherche IA langage naturel | properties (RLS) | ✅ OK |
| 10 | **enhance-image** | Amélioration images | storage | ✅ OK |

---

## 📋 SCHÉMA COMPLET (40+ Tables)

### Core (✅ OK)
- profiles, user_roles
- properties, property_inquiries, property_favorites, property_reviews, property_views
- conversations, messages
- ai_conversations, ai_messages
- testimonials, testimonial_likes

### Vérification (✅ OK mais complex)
- user_verifications, verification_documents, property_verifications
- user_reports, trust_score_history, user_blacklist

### Notifications (⚠️ CONFLITS)
- push_subscriptions (KEEPER)
- user_push_tokens (ORPHELINE)
- notification_preferences (DUPLIQUÉE)
- notification_history (DUPLIQUÉE)
- view_milestone_notifications, reengagement_sent

### Recommandation (⚠️ ORPHELINES)
- feedback_events, user_features, recommendation_stats, recommendation_logs (TRIPLÉES)
- property_embeddings (MANQUANTE)

---

# 🚀 PART 2: PLAN D'ACTION (PHASE PAR PHASE)

## ⏱️ TIMELINE ESTIMÉE: ~10 heures

### PHASE 1: SQL CLEANUP (2-3 heures)
**Objectif**: Rendre DB cohérente et prévisible

#### P1.1: Consolidation notification_preferences & notification_history
**Action**:
```sql
-- Fichier: supabase/migrations/202603xx_consolidate_notifications_tables.sql

-- Supprimer les doublons
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;

-- Recréer avec TOUTES les colonnes
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email
  email_new_message BOOLEAN DEFAULT true,
  email_new_inquiry BOOLEAN DEFAULT true,
  email_property_views BOOLEAN DEFAULT true,
  email_recommendations BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_weekly_digest BOOLEAN DEFAULT true,
  
  -- Push (TOUTES LES COLONNES!)
  push_new_message BOOLEAN DEFAULT true,
  push_new_inquiry BOOLEAN DEFAULT true,
  push_property_views BOOLEAN DEFAULT true,
  push_recommendations BOOLEAN DEFAULT true,
  push_marketing BOOLEAN DEFAULT false,
  push_new_review BOOLEAN DEFAULT true,
  push_high_views BOOLEAN DEFAULT true,
  push_new_property BOOLEAN DEFAULT true,
  push_price_drop BOOLEAN DEFAULT true,
  push_account BOOLEAN DEFAULT true,
  push_listing BOOLEAN DEFAULT true,
  
  -- SMS
  sms_new_message BOOLEAN DEFAULT false,
  sms_new_inquiry BOOLEAN DEFAULT true,
  sms_urgent_only BOOLEAN DEFAULT true,
  
  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  digest_frequency TEXT DEFAULT 'weekly' 
    CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'in_app')),
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own notification history"
  ON public.notification_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages notification history"
  ON public.notification_history FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_notification_prefs_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON public.notification_history(sent_at DESC);
```

**Fichiers à modifier**:
- ✅ Créer: `supabase/migrations/202603xx_consolidate_notifications_tables.sql`
- ❌ Supprimer/Commenter: Lignes de `base.sql` et `20260114205420` qui créent ces tables
- ❌ Adapter: `20260303032255` (enlever les ALTER qui modifient user_push_tokens)

**Validation**:
```bash
supabase db push  # Tester les migrations
```

---

#### P1.2: Supprimer user_push_tokens (ORPHELINE)
**Action**:
```sql
-- Fichier: supabase/migrations/202603xx_remove_user_push_tokens.sql

DROP TABLE IF EXISTS user_push_tokens CASCADE;
```

**Fichiers à modifier**:
- ❌ Supprimer: [20260220041127](supabase/migrations/20260220041127_7d28b3b1-4daf-4759-b9ba-94dba7bd9496.sql)
- ❌ Enlever ALTERs: Depuis [20260303032255](supabase/migrations/20260303032255_29b95380-8a34-4b5e-8f2e-ce049309c923.sql)

---

#### P1.3: Créer property_embeddings (MANQUANTE)
**Action**:
```sql
-- Fichier: supabase/migrations/202603xx_create_property_embeddings.sql

CREATE TABLE public.property_embeddings (
  property_id UUID NOT NULL PRIMARY KEY,
  vector FLOAT8[] NOT NULL,
  version TEXT DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

CREATE INDEX idx_property_embeddings_created ON public.property_embeddings(created_at);

-- RLS (optional if embeddings are auto-generated)
ALTER TABLE public.property_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages embeddings"
  ON public.property_embeddings FOR ALL
  TO service_role USING (true) WITH CHECK (true);
```

**Fichiers à modifier**:
- ✅ Créer: `supabase/migrations/202603xx_create_property_embeddings.sql`

---

#### P1.4: Nettoyer base-recommandation.sql (CORROMPU)
**Action**:
Créer migration de cleanup:

```sql
-- Fichier: supabase/migrations/202603xx_cleanup_orphaned_tables.sql

-- Supprimer les tables orphelines
DROP TABLE IF EXISTS feedback_events CASCADE;
DROP TABLE IF EXISTS user_features CASCADE;
DROP TABLE IF EXISTS recommendation_stats CASCADE;
DROP TABLE IF EXISTS recommendation_logs CASCADE;
```

**Fichiers à modifier**:
- ❌ Supprimer ou nettoyer: [base-recommandation.sql](supabase/migrations/base-recommandation.sql) (garder 1 occurrence seulement)
- ✅ Créer: `supabase/migrations/202603xx_cleanup_orphaned_tables.sql`

---

#### P1.5: Unifier trust_score Calculation
**Action**:
Garder VERSION 3 (complète), supprimer V1 et V2

```sql
-- Créer migration: 202603xx_unify_trust_score.sql

-- Garder version 3 (recalculate_trust_score)
-- Supprimer les versions 1 et 2 incompatibles

-- Assurer les triggers s'exécutent correctement:
CREATE TRIGGER trigger_recalc_trust_on_review
AFTER INSERT OR UPDATE OR DELETE ON property_reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_trust_score();

CREATE TRIGGER trigger_recalc_trust_on_report
AFTER INSERT OR UPDATE ON user_reports
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_trust_score();

CREATE TRIGGER trigger_recalc_trust_on_verification
AFTER UPDATE ON user_verifications
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_trust_score();
```

**Fichiers à supprimer**:
- ❌ [20260103095428](supabase/migrations/20260103095428_b381847a-9d07-43e9-91ca-c5637cb438aa.sql) (Version 1)
- ❌ [20260104005756](supabase/migrations/20260104005756_c84cef46-cbae-451b-b7bc-c350a46327d5.sql) (Version 2 - incomplete)

**Fichiers à garder**:
- ✅ [20260112100436](supabase/migrations/20260112100436_35daf38a-114e-4bcf-ba6c-5a17e8cdabfa.sql) (Version 3)

---

### PHASE 2: CONFIGURATION STRICTE (30 min)

#### P2.1: Strict Mode TypeScript
**Fichier à modifier**: [tsconfig.json](tsconfig.json)

**Changement**:
```json
{
  "compilerOptions": {
    "noImplicitAny": true,           // ✅ Strict
    "noUnusedParameters": true,      // ✅ Strict
    "noUnusedLocals": true,          // ✅ Strict
    "strictNullChecks": true,        // ✅ Strict
    "strict": true                   // ✅ Tous les flags stricts
  }
}
```

**Commandes**:
```bash
npx tsc --noEmit  # Tester la compilation
```

**Résultat attendu**: 10-20 erreurs TypeScript à fixer

---

#### P2.2: ESLint Rules Activation
**Fichier à modifier**: [eslint.config.js](eslint.config.js)

**Changement**:
```javascript
{
  "@typescript-eslint/no-unused-vars": [
    "error",
    { "argsIgnorePattern": "^_" }
  ],
  "no-unused-imports": "error"
}
```

---

#### P2.3: Run Compilation pour identifier errors
```bash
npm run build
npm run lint
npx tsc --noEmit
```

**Résultat attendu**: Lister les erreurs à fixer

---

### PHASE 3: REFACTOR FRONTEND (4-6 heures)

#### P3.1: Merger pushNotifications.ts INSIDE usePushNotifications.ts

**Fichier source**: [src/services/pushNotifications.ts](src/services/pushNotifications.ts)
**Fichier destination**: [src/hooks/usePushNotifications.ts](src/hooks/usePushNotifications.ts)

**Actions**:
1. Copier toutes les fonctions export de `pushNotifications.ts` DANS `usePushNotifications.ts`
2. Adapter les imports et les dépendances
3. Supprimer `pushNotifications.ts`
4. Tester que impots pointent vers le hook

---

#### P3.2: Audit useRecommendations vs recommend-properties Deno

**Fichiers**:
- [src/hooks/useRecommendations.ts](src/hooks/useRecommendations.ts)
- [supabase/functions/recommend-properties/index.ts](supabase/functions/recommend-properties/index.ts)

**Questions à poser**:
1. Cette logique d'embeddings est-elle calculée au deux endroits?
2. Peut-on consolider dans Deno seulement (backend)?
3. Or frontend a besoin d'accès direct aux embeddings?

**Décision suggérée**: Déplacer calculs vers Deno, hook appelle fonction

---

#### P3.3: Vérifier serviceWorkerManager duplication

**Fichiers**:
- [src/services/serviceWorkerManager.ts](src/services/serviceWorkerManager.ts)
- [src/services/notificationService.ts](src/services/notificationService.ts)

**Chercher**: Duplication `updateAppBadge()`, `clearBadge()`, etc.

---

### PHASE 4: VALIDATION & TESTS (2 heures)

#### P4.1: Build Production
```bash
npm run build
```
**Expected**: Zero errors

#### P4.2: Lint Check
```bash
npm run lint
```
**Expected**: Zero warnings (après P3)

#### P4.3: TypeScript Strict Check
```bash
npx tsc --noEmit
```
**Expected**: Zero errors

#### P4.4: Test E2E Push Notifications
```gherkin
Feature: Push Notifications
  Scenario: User can subscribe to push
    Given: User is logged in
    When: User clicks "Enable Notifications"
    Then: Browser asks for permission
    And: Permission is stored in push_subscriptions table
    And: Token is saved in notification_preferences
    
  Scenario: Push notification is received
    Given: User is subscribed
    When: handle-events triggers for new_message
    Then: send-push-notification is called
    And: Notification displays in browser
    
  Scenario: User can unsubscribe
    Given: User is subscribed
    When: User clicks "Disable Notifications"  
    Then: Subscription is removed from push_subscriptions
```

#### P4.5: Test E2E Recommendations
```gherkin
Feature: Property Recommendations
  Scenario: Embeddings are created
    Given: property_embeddings table exists
    When: New property is published
    Then: Embedding is calculated and saved
    
  Scenario: Recommendations are personalized
    Given: User has viewing history
    When: User opens HomePage
    Then: Recommended properties are shown
    And: Scoring respects A/B test group (control/embedding_v1/hybrid_ml)
```

---

## 📝 CHECKLIST AVANT LIVRAISON

### SQL
- [ ] P1.1 - notification_preferences & notification_history consolidées
- [ ] P1.2 - user_push_tokens supprimée
- [ ] P1.3 - property_embeddings créée
- [ ] P1.4 - base-recommandation.sql nettoyée
- [ ] P1.5 - trust_score unifié (version 3 seulement)
- [ ] `supabase db push` sans erreurs

### Configuration
- [ ] P2.1 - tsconfig.json strict mode ON
- [ ] P2.2 - eslint.config.js rules enabled
- [ ] P2.3 - `npx tsc --noEmit` zéro errors

### Code
- [ ] P3.1 - pushNotifications.ts mergé
- [ ] P3.2 - useRecommendations audit fait
- [ ] P3.3 - serviceWorkerManager duplication vérifiée

### Tests
- [ ] P4.1 - `npm run build` OK
- [ ] P4.2 - `npm run lint` OK
- [ ] P4.3 - `npx tsc --noEmit` OK
- [ ] P4.4 - E2E Push tests OK
- [ ] P4.5 - E2E Recommendations tests OK

---

## 🎯 SIGNOFF

**Audit Réalisé Par**: GitHub Copilot (Agent Review Complete)  
**Date**: 10 Mars 2026  
**Fichiers Analysés**: 50+  
**Conflits Identifiés**: 10  
**Tables Orphelines**: 5  
**Temps d'Exécution Estimé**: 10-12 heures  
**Sévérité Globale**: 🔴 **HAUTEMENT CRITIQUE** (But correctable)

**Prêt pour PHASE D'EXÉCUTION**: OUI ✅

---

## 📞 CONTACT POUR QUESTIONS

Si quelqu'un a des questions sur ce rapport:
1. Lire d'abord la section correspondante ci-dessus
2. Vérifier [AUDIT_REPORT.md](AUDIT_REPORT.md) pour plus de détails
3. Vérifier [ACTION_PLAN.md](ACTION_PLAN.md) pour le plan en détail
4. Consulter les fichiers SQL/code directement avec les liens fournis

---

**FIN DE LA DOCUMENTATION**
