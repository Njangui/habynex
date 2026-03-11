# 🚀 PLAN D'EXÉCUTION COMPLET - HABYNEX

**Date**: 10 Mars 2026  
**État**: 🔴 CRITIQUE mais CORRECTABLE  
**Durée Estimée**: 10-15 heures  
**Complexité**: HAUTE (Requiert DB Admin + Frontend Dev)

---

## ⚠️ BLOCAGE #1: QUESTIONS CRITIQUES À RÉPONDRE D'ABORD

**VOUS DEVEZ RÉPONDRE À CES 3 QUESTIONS AVANT DE COMMENCER**

### Question 1️⃣: Ordre d'Exécution des Migrations Supabase
```
Dans Supabase, base.sql s'exécute-t-il AVANT ou APRÈS les migrations datées?

Exemple:
- base.sql (ligne 70): CREATE TABLE notification_preferences
- 20260114205420_....sql: CREATE TABLE notification_preferences (IDENTIQUE)
- 20260303032255_....sql: ALTER TABLE notification_preferences ADD COLUMN...

Si base.sql s'exécute APRÈS 20260114205420:
  → La table est recréée SANS les colonnes de 20260303
  → CODE CRASH quand il accède push_new_review, push_high_views

RÉPONDRE: AVANT ou APRÈS?
```

**Réponse obligatoire**: `AVANT` / `APRÈS` / `ON NE SAIT PAS`

---

### Question 2️⃣: Données Existantes en Production
```
Lesquels de ces tables ont des DONNÉES en production?
(Important pour ne pas perdre data historique)

- push_subscriptions: a-t-elle des rows? (OUI/NON)
- user_push_tokens: a-t-elle des rows? (OUI/NON)  
- feedback_events: a-t-elle des rows? (OUI/NON)
- notification_preferences: combien de rows? (___)
- notification_history: combien de rows? (___)

NOTE: user_push_tokens n'est JAMAIS utilisée dans le code
      → Si vide, supprimer directement
      → Si pleine, sauvegarder d'abord
```

**Réponses obligatoires**: Nombres exactes ou Y/N

---

### Question 3️⃣: Quelle Version Trust Score est Active?
```
Vous avez 3 formules différentes:

V1 (20260103095428):
  +30 level_1, +25 level_2, +30 level_3, +40 level_4
  -10 par annulation
  +5 si response_rate ≥ 90%

V2 (20260104005756):
  Fichier TRONQUÉ/INCOMPLET

V3 (20260112100436):
  +30 level_1_status
  + (positive_reviews * 5) max +20
  - (negative_reviews * 10)
  - (reports_count * 15)
  + bonus de response_rate

LAQUELLE est active? Vérifier dans DB:
SELECT prosrc FROM pg_proc WHERE proname LIKE 'recalculate_trust_score%';

RÉPONDRE: V1 / V2 / V3 / AUTRE?
```

**Réponse obligatoire**: Version numéro

---

## 📋 AVANT DE COMMENCER: PRÉPARATION

### ✅ Checklist Pré-Exécution

- [ ] **Backup complet de la base Supabase** (CRITIQUE!)
  ```bash
  # Via Supabase dashboard:
  # Dashboard → Project Settings → Backups → Create Manual Backup
  ```

- [ ] **Backup du code** (Git commit)
  ```bash
  cd ~/Desktop/Habynex
  git add -A
  git commit -m "Pre-cleanup backup - $(date)"
  ```

- [ ] **Vérifier environment variables**
  ```bash
  # Doit avoir:
  # VITE_SUPABASE_URL=https://...supabase.co
  # VITE_SUPABASE_ANON_KEY=eyJ...
  # VITE_VAPID_PUBLIC_KEY=BK...
  
  cat .env.local
  ```

- [ ] **Vérifier accès CLI Supabase**
  ```bash
  supabase projects list
  supabase status
  ```

- [ ] **Répondre aux 3 questions ci-dessus** (OBLIGATOIRE)

---

# PHASE 1: SQL CLEANUP (3-4 heures)

## Step 1.1: Diagnostiquer l'État Actuel de la BD

⏱️ **Temps**: 30 min  
📝 **Fichiers**: Aucun (queries seulement)

### Action 1.1.1: Lancer les diagnostics

Ouvrir **Supabase Dashboard** → **SQL Editor** et exécuter:

```sql
-- DIAGNOSTIC #1: Vérifier qu'il y a bien des doublons
SELECT table_name, COUNT(*) as occurrences
FROM information_schema.tables
WHERE table_schema = 'public'
GROUP BY table_name
HAVING COUNT(*) > 1;

-- DIAGNOSTIC #2: Colonnes réelles de notification_preferences
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- DIAGNOSTIC #3: Combien de rows dans chaque table?
SELECT 'push_subscriptions' as table_name, COUNT(*) as row_count FROM push_subscriptions
UNION ALL
SELECT 'user_push_tokens', COUNT(*) FROM user_push_tokens
UNION ALL
SELECT 'notification_preferences', COUNT(*) FROM notification_preferences
UNION ALL
SELECT 'notification_history', COUNT(*) FROM notification_history
UNION ALL
SELECT 'property_embeddings', COUNT(*) FROM property_embeddings
UNION ALL
SELECT 'feedback_events', COUNT(*) FROM feedback_events;

-- DIAGNOSTIC #4: Lister TOUTES les migrations
SELECT id FROM _supabase_migrations 
ORDER BY name;

-- DIAGNOSTIC #5: Vérifier quelle version trust_score existe
\df *trust_score*
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%trust%';
```

### Action 1.1.2: Documenter les résultats

Créer un fichier `DIAGNOSTIC_BD.txt` avec les résultats:

```
=== DIAGNOSTIC BD HABYNEX ===
Date: [aujourd'hui]

1. DOUBLONS TABLES:
   [résultats du query #1]

2. COLONNES notification_preferences:
   [résultats du query #2]

3. ROWS PAR TABLE:
   [résultats du query #3]

4. MIGRATIONS:
   [résultats du query #4]

5. VERSIONS TRUST_SCORE:
   [résultats du query #5]
```

**Validation**: ✅ Si vous avez les résultats, passez au step 1.2

---

## Step 1.2: Décider de la Stratégie (Basé sur réponses Q1-Q3)

⏱️ **Temps**: 15 min  
📝 **Décision Requise**: Répondre à Q1, Q2, Q3

### Stratégie A: base.sql s'exécute AVANT migrations datées

**Si Q1 = AVANT**:
```
→ base.sql est source de vérité
→ Migrations datées modifient après
→ Garder base.sql, supprimer duplications dans fichiers datés
```

### Stratégie B: base.sql s'exécute APRÈS migrations datées

**Si Q1 = APRÈS**:
```
→ Migrations datées sont source de vérité
→ base.sql qui vient après ÉCRASE tout
→ Supprimer notification_preferences ET notification_history de base.sql
→ Garder définitions dans migrations datées
```

### Stratégie C: On ne sait pas

**Si Q1 = ON NE SAIT PAS**:
```
→ Création nouvelle migration consolidatrice
→ DROP les tables
→ RECRÉER avec toutes les colonnes
→ (Solution la plus sûre mais potentiellement perte de data)
```

**DÉCISION REQUISE AVANT DE CONTINUER**

Notez votre stratégie: `Stratégie ___`

---

## Step 1.3: Supprimer user_push_tokens (ORPHELINE)

⏱️ **Temps**: 45 min  
📝 **Fichiers à modifier**: 2

### Action 1.3.1: Créer migration de suppression

```bash
# Terminal
cd ~/Desktop/Habynex

# Créer fichier migration
touch supabase/migrations/202603101000_remove_user_push_tokens.sql
```

### Action 1.3.2: Ajouter le contenu SQL

Ouvrir `supabase/migrations/202603101000_remove_user_push_tokens.sql`

Ajouter:
```sql
-- Supprimer table user_push_tokens (orpheline)
DROP TABLE IF EXISTS user_push_tokens CASCADE;
```

### Action 1.3.3: Supprimer la migration originale qui la créait

```bash
# Supprimer le fichier qui a créé user_push_tokens
rm supabase/migrations/20260220041127_*.sql
```

### Action 1.3.4: Nettoyer les références dans 20260303032255

Ouvrir `supabase/migrations/20260303032255_29b95380-8a34-4b5e-8f2e-ce049309c923.sql`

**Trouver et SUPPRIMER ces lignes**:
```sql
-- SUPPRIMER CES LIGNES EXACTES:
ALTER TABLE public.user_push_tokens
ADD COLUMN IF NOT EXISTS subscription JSONB;

ALTER TABLE public.user_push_tokens
DROP CONSTRAINT IF EXISTS user_push_tokens_user_id_token_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_push_tokens_user_subscription
ON public.user_push_tokens(user_id, subscription);
```

Laisser le reste du fichier intact.

### Validation Step 1.3
```bash
cd ~/Desktop/Habynex
supabase db push
# Doit dire: "No migrations available to apply"
# Ou "Applied migration: 202603101000_remove_user_push_tokens"
```

✅ Continuer au step 1.4

---

## Step 1.4: Créer property_embeddings (MANQUANTE)

⏱️ **Temps**: 45 min  
📝 **Fichiers à créer**: 1

### Action 1.4.1: Créer fichier migration

```bash
touch supabase/migrations/202603101001_create_property_embeddings.sql
```

### Action 1.4.2: Ajouter le SQL

Ouvrir le fichier et ajouter:

```sql
-- Créer table property_embeddings (manquante)
CREATE TABLE IF NOT EXISTS public.property_embeddings (
  property_id UUID NOT NULL PRIMARY KEY,
  embedding BYTEA,  -- Stockage binaire pour embeddings
  embedding_model TEXT DEFAULT 'ada-v2',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_property_embeddings_property_id 
    FOREIGN KEY (property_id) 
    REFERENCES public.properties(id) 
    ON DELETE CASCADE
);

-- Index pour performances
CREATE INDEX idx_property_embeddings_created 
  ON public.property_embeddings(created_at);
CREATE INDEX idx_property_embeddings_model 
  ON public.property_embeddings(embedding_model);

-- Enable RLS
ALTER TABLE public.property_embeddings ENABLE ROW LEVEL SECURITY;

-- Politique RLS (service role peut lire/écrire)
CREATE POLICY "Service role manages embeddings"
  ON public.property_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ajouter fonction pour peupler les embeddings
CREATE OR REPLACE FUNCTION public.generate_property_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer embedding vide pour nouvelle propriété
  -- La fonction recommend-properties remplira les valeurs réelles
  INSERT INTO public.property_embeddings (property_id, embedding)
  VALUES (NEW.id, NULL)
  ON CONFLICT (property_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: créer embedding quand propriété est publiée
CREATE TRIGGER trigger_create_embedding_on_publish
AFTER INSERT OR UPDATE OF is_published ON public.properties
FOR EACH ROW
WHEN (NEW.is_published = true)
EXECUTE FUNCTION generate_property_embedding();
```

### Validation Step 1.4
```bash
supabase db push
# Doit appliquer la migration sans erreur
# Vérifier table existe:
supabase --username postgres --initial-mode true
# SELECT * FROM property_embeddings LIMIT 1;
```

✅ Continuer au step 1.5

---

## Step 1.5: Nettoyer base-recommandation.sql (CORROMPU)

⏱️ **Temps**: 30 min  
📝 **Fichiers à modifier**: 1

**Le fichier base-recommandation.sql a les 4 tables créées 3 fois chacune.**

### Action 1.5.1: Ouvrir le fichier

Ouvrir `supabase/migrations/base-recommandation.sql`

### Action 1.5.2: Identifier les duplications

Le fichier devrait avoir une structure comme:
```
Ligne 1-50:   CREATE TABLE feedback_events ...
Ligne 40-90:  CREATE TABLE feedback_events ... (DUPLICATE)
Ligne 100-150: CREATE TABLE feedback_events ... (DUPLICATE)

Idem pour: user_features, recommendation_stats, recommendation_logs
```

### Action 1.5.3: Nettoyer

**OPTION 1 (Recommandée): Supprimer complètement le fichier**
```bash
rm supabase/migrations/base-recommandation.sql
```

Ensuite créer une nouvelle migration:

```bash
touch supabase/migrations/202603101002_create_recommendation_schema.sql
```

Ajouter le contenu propre (une seule fois):

```sql
-- Créer tables de recommandation (schema neuf)
CREATE TABLE IF NOT EXISTS public.feedback_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'favorite', 'inquiry', 'review')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_features (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_views INT DEFAULT 0,
  favorite_types TEXT[] DEFAULT '{}',
  favorite_cities TEXT[] DEFAULT '{}',
  avg_price_range DECIMAL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  score DECIMAL NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_count INT NOT NULL,
  total_score DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feedback_events_user_id ON public.feedback_events(user_id);
CREATE INDEX idx_feedback_events_property_id ON public.feedback_events(property_id);
CREATE INDEX idx_recommendation_stats_user_id ON public.recommendation_stats(user_id);

-- RLS
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own feedback"
  ON public.feedback_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages recommendations"
  ON public.recommendation_stats FOR ALL
  TO service_role USING (true) WITH CHECK (true);
```

**OPTION 2 (Si base-recommandation.sql a du contenu utile):**

Nettoyer manuellement:
1. Ouvrir le fichier
2. Identifier la première occurrence de `CREATE TABLE feedback_events`
3. Supprimer toutes les occurrences **après la première**
4. Garder une seule occurrence de chaque table

### Validation Step 1.5
```bash
supabase db push
```

✅ Continuer au step 1.6

---

## Step 1.6: Consolider notification_preferences & notification_history

⏱️ **Temps**: 1.5 heures  
📝 **Complexité**: HAUTE - Dépend de réponse Q1

**⚠️ ATTENTION: Cette étape varie selon votre réponse à Q1**

---

### SCÉNARIO A: base.sql s'exécute AVANT migrations datées

**Action A1: Garder base.sql, supprimer duplications**

Ouvrir `base.sql`

**Chercher et GARDER seulement**:
```sql
-- GARDER CES DÉFINITIONS (première occurrence)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_new_message boolean DEFAULT true,
  ...
);

CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ...
);
```

Ouvrir `supabase/migrations/20260114205420_841a859a-a5ad-44ca-b7b5-9f0a6fbd989b.sql`

**Supprimer COMPLÈTEMENT** les sections:
```sql
-- SUPPRIMER TOUT CECI:
CREATE TABLE public.notification_preferences (...)
CREATE TABLE public.notification_history (...)
```

Vérifier que la migration `20260303032255` ajoute correctement les colonnes manquantes (elle devrait allérer, pas créer).

---

### SCÉNARIO B: base.sql s'exécute APRÈS migrations datées

**Action B1: Supprimer de base.sql, garder migrations datées**

Ouvrir `base.sql`

**Supprimer ces sections ou commenter**:
```sql
-- SUPPRIMER/COMMENTER:
CREATE TABLE IF NOT EXISTS public.notification_preferences (...)

-- Et:
CREATE TABLE IF NOT EXISTS public.notification_history (...)
```

Ouvrir `20260114205420` et `20260303032255` - garder intactes (elles sont source de vérité).

---

### SCÉNARIO C: On ne sait pas / Solution sûre

Créer nouvelle migration de consolidation:

```bash
touch supabase/migrations/202603101003_consolidate_notifications.sql
```

Contenu:
```sql
-- Consolidation notifications (solution sûre)
-- Supprimer les deux tables
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_history CASCADE;

-- Recréer avec TOUTES les colonnes requises
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email channels
  email_new_message BOOLEAN DEFAULT true,
  email_new_inquiry BOOLEAN DEFAULT true,
  email_property_views BOOLEAN DEFAULT true,
  email_recommendations BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_weekly_digest BOOLEAN DEFAULT true,
  
  -- Push channels (TOUTES LES COLONNES)
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
  
  -- SMS channels
  sms_new_message BOOLEAN DEFAULT false,
  sms_new_inquiry BOOLEAN DEFAULT true,
  sms_urgent_only BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  -- Digest
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

CREATE POLICY "Service role manages notifications"
  ON public.notification_history FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_notification_preferences_user_id 
  ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_history_user_id 
  ON public.notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at 
  ON public.notification_history(sent_at DESC);
```

### Validation Step 1.6
```bash
supabase db push

# Vérifier colonnes réelles
supabase --username postgres --initial-mode true
# SELECT column_name FROM information_schema.columns 
#   WHERE table_name='notification_preferences' 
#   ORDER BY ordinal_position;
```

✅ Continuer au step 1.7

---

## Step 1.7: Unifier trust_score (Garder V3 seulement)

⏱️ **Temps**: 30 min  
📝 **Basé sur": Réponse Q3

### Action 1.7.1: Identifier les fichiers de versions

Trouver les 3 fichiers qui définissent trust_score:
- `20260103095428_b381847a-...sql` (V1)
- `20260104005756_c84cef46-...sql` (V2)  
- `20260112100436_35daf38a-...sql` (V3)

### Action 1.7.2: Garder seulement V3

**Selon réponse Q3:**

- **Si V3 est active**: Supprimer V1 et V2
  ```bash
  rm supabase/migrations/20260103095428_*.sql
  rm supabase/migrations/20260104005756_*.sql
  ```

- **Si V1 ou V2 est active**: Renommer V3 pour préserver votre version

### Action 1.7.3: Créer migration de consolidation

```bash
touch supabase/migrations/202603101004_unify_trust_score.sql
```

Contenu:
```sql
-- Unifier trust_score - VERSION FINALE
-- Supprimer les anciennes versions de la fonction
DROP FUNCTION IF EXISTS public.recalculate_trust_score_v1();
DROP FUNCTION IF EXISTS public.recalculate_trust_score_v2();

-- Créer fonction finale (V3 = plus complète)
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_level1_bonus INTEGER := 0;
  v_review_bonus INTEGER := 0;
  v_report_penalty INTEGER := 0;
  v_response_bonus INTEGER := 0;
  v_total_score INTEGER := 0;
BEGIN
  -- Level 1 verification bonus
  SELECT CASE WHEN level_1_status = 'approved' THEN 30 ELSE 0 END
  INTO v_level1_bonus
  FROM public.user_verifications
  WHERE user_id = p_user_id;

  -- Positive reviews bonus (max +20)
  SELECT MIN(positive_reviews_count * 5, 20)
  INTO v_review_bonus
  FROM public.user_verifications
  WHERE user_id = p_user_id;

  -- Report penalty
  SELECT COALESCE(COUNT(*) * -15, 0)
  INTO v_report_penalty
  FROM public.user_reports
  WHERE reported_user_id = p_user_id
    AND status = 'validated';

  -- Response rate bonus
  SELECT CASE 
    WHEN response_rate >= 90 THEN 20
    WHEN response_rate >= 75 THEN 15
    WHEN response_rate >= 50 THEN 10
    ELSE 0
  END
  INTO v_response_bonus
  FROM public.user_verifications
  WHERE user_id = p_user_id;

  -- Total
  v_total_score := COALESCE(v_level1_bonus, 0) 
                 + COALESCE(v_review_bonus, 0)
                 + COALESCE(v_report_penalty, 0)
                 + COALESCE(v_response_bonus, 0);

  -- Clamp between 0 and 100
  v_total_score := GREATEST(0, LEAST(100, v_total_score));

  -- Update user_verifications
  UPDATE public.user_verifications
  SET trust_score = v_total_score,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql;

-- Créer triggers pour recalculs automatiques
DROP TRIGGER IF EXISTS trigger_recalc_trust_on_review ON public.property_reviews;
CREATE TRIGGER trigger_recalc_trust_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_trust_score(
    COALESCE(NEW.reviewer_id, OLD.reviewer_id)
  );

DROP TRIGGER IF EXISTS trigger_recalc_trust_on_report ON public.user_reports;
CREATE TRIGGER trigger_recalc_trust_on_report
  AFTER INSERT OR UPDATE ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_trust_score(NEW.reported_user_id);

DROP TRIGGER IF EXISTS trigger_recalc_trust_on_verification ON public.user_verifications;
CREATE TRIGGER trigger_recalc_trust_on_verification
  AFTER UPDATE ON public.user_verifications
  FOR EACH ROW
  WHEN (OLD.level_1_status IS DISTINCT FROM NEW.level_1_status 
        OR OLD.response_rate IS DISTINCT FROM NEW.response_rate)
  EXECUTE FUNCTION recalculate_trust_score(NEW.user_id);

-- Recalculer le score de tous les utilisateurs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.user_verifications
  LOOP
    PERFORM public.recalculate_trust_score(r.user_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Validation Step 1.7
```bash
supabase db push

# Vérifier que la fonction existe
supabase --username postgres --initial-mode true
# \df recalculate_trust_score
```

✅ PHASE 1 COMPLÉTÉE!

---

## ✅ VALIDATION PHASE 1

Exécuter ces commandes:
```bash
cd ~/Desktop/Habynex

# 1. Push toutes les migrations
supabase db push

# 2. Vérifier qu'il n'y a pas d'erreurs
supabase status

# 3. Vérifier tables existent
supabase --username postgres --initial-mode true
# SELECT table_name FROM information_schema.tables 
#   WHERE table_schema = 'public' AND table_name IN (
#   'notification_preferences', 'notification_history', 
#   'property_embeddings', 'push_subscriptions')
#   ORDER BY table_name;
```

**Résultat attendu**:
```
 notification_history
 notification_preferences
 property_embeddings
 push_subscriptions
```

**Pas** de `user_push_tokens`!

---

# PHASE 2: CONFIGURATION STRICTE (1 heure)

## Step 2.1: Strict Mode TypeScript

⏱️ **Temps**: 20 min  
📝 **Fichier**: tsconfig.json

### Action 2.1.1: Ouvrir tsconfig.json

Ouvrir `tsconfig.json`

Trouver cet section:
```json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "noUnusedParameters": false,
    "noUnusedLocals": false,
    "strictNullChecks": false,
```

### Action 2.1.2: Remplacer par:

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "noUnusedParameters": true,
    "noUnusedLocals": true,
    "strictNullChecks": true,
    "strict": true,
```

### Action 2.1.3: Tester la compilation

```bash
cd ~/Desktop/Habynex
npx tsc --noEmit
```

Vous verrez des erreurs. **C'est normal.** Notez le nombre:
```
Found XX errors in files.
```

Continuer au step 2.2 (les erreurs seront fixes phase 3).

---

## Step 2.2: ESLint Rules

⏱️ **Temps**: 10 min  
📝 **Fichier**: eslint.config.js

### Action 2.2.1: Ouvrir eslint.config.js

Trouver:
```javascript
{
  "@typescript-eslint/no-unused-vars": "off"
```

Remplacer par:
```javascript
{
  "@typescript-eslint/no-unused-vars": [
    "error",
    { "argsIgnorePattern": "^_" }
  ],
  "no-unused-imports": "error"
}
```

### Action 2.2.2: Tester

```bash
npm run lint
```

Vous verrez warnings. **C'est normal et attendu.**

---

## Step 2.3: Générer Rapport d'Erreurs

⏱️ **Temps**: 10 min

```bash
cd ~/Desktop/Habynex

# Générer rapport TypeScript
npx tsc --noEmit > TYPESCRIPT_ERRORS.txt 2>&1

# Générer rapport ESLint
npm run lint > ESLINT_ERRORS.txt 2>&1

# Afficher résumés
echo "=== TYPESCRIPT ERRORS ===" && wc -l TYPESCRIPT_ERRORS.txt
echo "=== ESLINT ERRORS ===" && wc -l ESLINT_ERRORS.txt
```

**Gardez ces fichiers** - vous les utiliserez phase 3.

---

# PHASE 3: REFACTOR FRONTEND (3-4 heures)

## Step 3.1: Fixer Hook API - PRIORITÉ 1

⏱️ **Temps**: 1 heure  
📝 **Criticité**: 🔴 BLOQUANT

**PROBLÈME**: Composant `NotificationActivateButton` appelle hook `usePushNotifications` avec mauvais noms de props.

### Action 3.1.1: Vérifier le problème

Ouvrir `src/components/NotificationActivateButton.tsx`

Chercher:
```typescript
const { 
  permission,     // ← MAUVAIS nom
  subscription,   // ← MAUVAIS nom
  isSupported, 
  isLoading, 
  subscribe,      // ← MAUVAIS nom
  unsubscribe 
} = usePushNotifications();
```

Ouvrir `src/hooks/usePushNotifications.ts`

Voir qu'il exporte:
```typescript
return {
  permissionState,    // ← Nom différent!
  isSubscribed,       // ← Nom différent!
  isLoading,
  subscribeToPush,    // ← Nom différent!
  unsubscribe
};
```

### Action 3.1.2: OPTION A (Recommandée): Adapter le Composant

Ouvrir `src/components/NotificationActivateButton.tsx`

Trouver:
```typescript
const { 
  requestPermission, 
  permissionState, 
  subscribeToPush 
} = usePushNotifications();
```

Remplacer par:
```typescript
const { 
  permissionState,    // Bon! Le hook l'exporte
  isSubscribed,       // Bon! Le hook l'exporte
  subscribeToPush,    // Bon! Le hook l'exporte
  unsubscribe 
} = usePushNotifications();
```

Puis chercher cet ligne dans le composant:
```typescript
const handleDisable = async () => {
  if (!user) return;
  setLoading(true);
  try {
    await unsubscribeFromPush(user.id);  // ← MAUVAIS import!
```

Remplacer par:
```typescript
const handleDisable = async () => {
  if (!user) return;
  setLoading(true);
  try {
    const { unsubscribe } = usePushNotifications();
    await unsubscribe();  // ← Bon!
```

### Action 3.1.3: Supprimer l'import mauvais

Dans `NotificationActivateButton.tsx`, chercher:
```typescript
import { unsubscribeFromPush } from '@/services/pushNotifications';
```

**SUPPRIMER cette ligne** - elle vient du service qu'on va fusionner.

### Action 3.1.4: Tester

```bash
cd ~/Desktop/Habynex
npx tsc src/components/NotificationActivateButton.tsx --noEmit
npm run lint src/components/NotificationActivateButton.tsx
```

✅ Pas d'erreurs TypeScript/ESLint

---

## Step 3.2: Merger pushNotifications Service dans Hook

⏱️ **Temps**: 45 min  
📝 **Fichiers**: 2

**PROBLÈME**: Duplication - même code en deux endroits.

### Action 3.2.1: Examiner le service

Ouvrir `src/services/pushNotifications.ts`

Elle exporte:
```typescript
export const checkExistingSubscription = async (userId: string) => { ... }
export const unsubscribeFromPush = async (userId: string) => { ... }
```

### Action 3.2.2: Vérifier qu'elles existent déjà dans le hook

Ouvrir `src/hooks/usePushNotifications.ts`

Chercher les fonctions homologues (elles s'appellent peut-être différemment):
- `checkExistingSubscription` → vérifie si y'a déjà une subscription (dans `useEffect` ligne ~60)
- `unsubscribeFromPush` → la méthode `unsubscribe` du hook

### Action 3.2.3: Supprimer le service

```bash
rm src/services/pushNotifications.ts
```

### Action 3.2.4: Trouver tous les imports du service

```bash
cd ~/Desktop/Habynex
grep -r "from.*pushNotifications" src/
```

Résultat attendu:
```
src/components/NotificationActivateButton.tsx: import { unsubscribeFromPush } from '@/services/pushNotifications';
```

(Juste un - qu'on a déjà corrigé)

### Action 3.2.5: Vérifier N'il y a pas d'autres imports

S'il y en a d'autres, les corriger pour importer du hook:
```typescript
// AVANT:
import { checkExistingSubscription } from '@/services/pushNotifications';

// APRÈS:
import { usePushNotifications } from '@/hooks/usePushNotifications';
// Et utiliser:
const { /* ce qu'il faut */ } = usePushNotifications();
```

### Validation Step 3.2
```bash
npx tsc --noEmit
npm run lint
```

✅ Continuer step 3.3

---

## Step 3.3: Fixer NotificationPreferencesPanel

⏱️ **Temps**: 30 min  
📝 **Fichier**: 1

**PROBLÈME**: Composant appelle async functions mais ne gère pas loading state.

### Action 3.3.1: Ouvrir le composant

Ouvrir `src/components/NotificationPreferencesPanel.tsx`

Chercher:
```typescript
<Switch
  id={prefKey}
  checked={preferences[prefKey] as boolean}
  onCheckedChange={() => togglePreference(prefKey)}
  disabled={saving}
/>
```

### Action 3.3.2: Ajouter async/await

Remplacer par:
```typescript
<Switch
  id={prefKey}
  checked={preferences[prefKey] as boolean}
  onCheckedChange={async () => {
    await togglePreference(prefKey);
  }}
  disabled={saving}  // Déjà correct
/>
```

### Action 3.3.3: Enlever "Coming Soon" de Push

Chercher:
```typescript
{/* Push Notifications - Coming Soon */}
<Card className="opacity-60">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Bell className="h-5 w-5" />
      {t("notif.push")}
      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
        {t("notif.comingSoon")}
      </span>
    </CardTitle>
```

Remplacer par:
```typescript
{/* Push Notifications */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Bell className="h-5 w-5" />
      {t("notif.push")}
    </CardTitle>
```

Et enlever les `disabled` props des Switch pour Push:
```typescript
// AVANT:
<NotificationRow icon={MessageSquare} label={t("notif.newMessage")} prefKey="push_new_message" disabled />

// APRÈS:
<NotificationRow icon={MessageSquare} label={t("notif.newMessage")} prefKey="push_new_message" />
```

### Validation Step 3.3
```bash
npx tsc src/components/NotificationPreferencesPanel.tsx --noEmit
npm run lint src/components/NotificationPreferencesPanel.tsx
```

---

## Step 3.4: Simplify useRecommendations Hook

⏱️ **Temps**: 30 min  
📝 **Fichier**: 1

**PROBLÈME**: 3 fallback queries quasi identiques, code confus.

### Action 3.4.1: Ouvrir le hook

Ouvrir `src/hooks/useRecommendations.ts`

Voir:
```typescript
const fetchRecommendations = useCallback(async () => {
  try {
    // Try edge function first
    const { data, error: fnError } = await supabase.functions.invoke(...);
    if (!fnError && data?.recommendations?.length > 0) {
      setRecommendations(data.recommendations);
      return;
    }

    // Fallback: fetch published properties
    const { data: fallbackData } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    setRecommendations(fallbackData || []);
  } catch (err) {
    // Ultimate fallback - EXACT DUPLICATE du fallback 1!
    try {
      const { data: fallbackData } = await supabase
        .from("properties")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      setRecommendations(fallbackData || []);
    } catch {
      setError("Erreur lors du chargement des recommandations");
    }
  }
}, [user, limit]);
```

### Action 3.4.2: Simplifier

Remplacer TOUTE la fonction par:
```typescript
const fetchRecommendations = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    // Try Deno function with ML
    const { data, error: fnError } = await supabase.functions.invoke(
      "recommend-properties",
      { body: { user_id: user?.id || null, limit } }
    );

    if (!fnError && data?.recommendations?.length > 0) {
      setRecommendations(data.recommendations);
      return;
    }

    // Fallback: simple published properties query
    const { data: fallbackData, error: fbError } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fbError) throw fbError;
    setRecommendations(fallbackData || []);
  } catch (err) {
    console.error("Error fetching recommendations:", err);
    setError("Erreur lors du chargement des recommandations");
    setRecommendations([]);
  } finally {
    setLoading(false);
  }
}, [user, limit]);
```

### Validation Step 3.4
```bash
npx tsc src/hooks/useRecommendations.ts --noEmit
```

---

## Step 3.5: Fixer erreurs TypeScript automatiques

⏱️ **Temps**: 1.5 heures  
📝 **Nombre d'erreurs**: ~10-20

Exécuter:
```bash
npx tsc --noEmit 2>&1 | head -20
```

Vous verrez quelque chose comme:
```
src/pages/CreateListing.tsx:45:5 - error TS2339: Property 'foo' does not exist on type 'Bar'
src/hooks/useMessages.ts:20:10 - error TS2554: Expected 0 arguments, but got 1
```

Pour chaque erreur:
1. Ouvrir le fichier
2. Aller à la ligne indiquée
3. Lire l'erreur
4. Corriger

**Types d'erreurs courantes**:
- `Property 'X' does not exist` → Ajouter le type manquant
- `Expected 0 arguments, but got 1` → Enlever argument ou ajouter paramètre
- `Type 'string' is not assignable to type 'number'` → Convertir type

**Conseil**: Fixer une fichier à la fois, tester:
```bash
npx tsc src/pages/CreateListing.tsx --noEmit
```

Quand zéro erreur, passer au suivant.

### Validation Step 3.5
```bash
npx tsc --noEmit
# Devrait dire: "error TS5014: Built-in error code 'TS5014' is not recognized."
# OU zéro erreurs générales!
```

---

## Step 3.6: Fixer erreurs ESLint

⏱️ **Temps**: 30 min

Exécuter:
```bash
npm run lint 2>&1 | grep "error" | head -20
```

Chaque erreur ressemble à:
```
src/components/Foo.tsx:45:10 error 'unused' is defined but never used no-unused-vars
```

Fixer avec:
- Supprimer variable inutilisée
- Ou ajouter préfixe `_`: `const _unused = ...`

Pour auto-fixer:
```bash
npx eslint src --fix
```

### Validation Step 3.6
```bash
npm run lint
# Devrait avoir zéro "error"
```

---

## ✅ VALIDATION PHASE 3

```bash
cd ~/Desktop/Habynex

# 1. TypeScript Strict
npx tsc --noEmit
# Résultat: "Found 0 errors"

# 2. ESLint
npm run lint
# Résultat: zéro "error"

# 3. Build
npm run build
# Résultat: "✓ built in Xs"
```

---

# PHASE 4: TESTS & VALIDATION (2-3 heures)

## Step 4.1: Build Production

⏱️ **Temps**: 15 min

```bash
cd ~/Desktop/Habynex
npm run build
```

**Résultat attendu**:
```
✓ built in 45s
  ├─ src/main.tsx                          5.50 kB
  ├─ src/App.tsx                           2.30 kB
  └─ src/pages/...                         XX kB
  
dist/index.html                       2.15 kB
```

**SI ERREUR**: Lire le message, corriger, réessayer.

---

## Step 4.2: Test E2E Push Notifications

⏱️ **Temps**: 45 min

### Scénario 1: Abonnement Push

```
✅ USER STORY: Utilisateur peut s'abonner aux notifications push

GIVEN: Utilisateur est connecté sur Dashboard
WHEN: Utilisateur clique sur "🔔 Activer les notifications"
THEN: Navigateur demande permission (modal OS)
AND: Utilisateur clique "Autoriser" 
AND: Message "Notifications activées!" apparaît
AND: Bouton change en "Notifications activées ✓"
AND: Subscription est créée dans push_subscriptions table
```

**Commandes de test**:
```sql
-- Vérifier subscription dans DB
SELECT user_id, endpoint FROM push_subscriptions 
WHERE user_id = '[votre-user-id]' LIMIT 1;
```

### Scénario 2: Recevoir notification

```
✅ USER STORY: L'app reçoit une notification push quand quelqu'un envoie message

GIVEN: User A est abonné aux notifications
AND: User A a envoyé message à User B
AND: User A est déconnecté du navigation
WHEN: User B reçoit le message (l'insère dans DB)
THEN: Trigger `handle-events` s'exécute
AND: Fonction Deno `send-push-notification` est appelée
AND: Navigateur de User A affiche notification système
AND: Clic sur notification ouvre `/messages`
```

**Pour tester manuellement**:
1. Ouvrir deux instances du navigateur (User A et User B)
2. User A: Dashboard → "Activer les notifications"  
3. User A: Fermer le navigateur
4. User B: Aller à Message User A → Envoyer un message
5. **User A: Vérifier que notification apparaît même si page fermée** (le Service Worker récupère)

### Scénario 3: Désabonnement

```
✅ USER STORY: Utilisateur peut se désabonner

GIVEN: Utilisateur a les notifications activées
WHEN: Utilisateur clique "🔔 Désactiver"
THEN: Subscription est supprimée de push_subscriptions
AND: Message "Notifications désactivées" apparaît
AND: Bouton revient à "🔔 Activer les notifications"
```

---

## Step 4.3: Test E2E Recommandations

⏱️ **Temps**: 30 min

```
✅ USER STORY: Recommandations d'annonces personnalisées

GIVEN: Utilisateur est seeker
WHEN: Utilisateur visite 5 annonces (studios à Yaoundé)
AND: Utilisateur revient à Homepage
THEN: Recommandations contiennent des studios à Yaoundé
AND: Scoring est calculé via Deno function
```

**Pour tester**:
1. Logged in utilisateur
2. Visiter 5 propriétés avec même filtre
3. Aller à Dashboard / Recommandations section
4. Vérifier que les annonces proposées correspondent

### Vérification Backend:
```sql
-- Vérifier property_views sont enregistrées
SELECT COUNT(*) FROM property_views 
WHERE user_id = '[user-id]';

-- Vérifier que property_embeddings existent
SELECT COUNT(*) FROM property_embeddings;
```

---

## Step 4.4: Test E2E Préférences Notifications

⏱️ **Temps**: 30 min

```
✅ USER STORY: Utilisateur peut configurer ses préférences de notifications

GIVEN: Utilisateur est sur Profile
WHEN: Utilisateur accède "Notification Preferences"
THEN: Voir les sections: Email, Push, SMS, Quiet Hours
AND: Chaque toggle peut être activé/désactivé
AND: Quiet hours can be configured (22:00 - 08:00)
WHEN: Utilisateur change une préférence
THEN: Changement est sauvegardé en BD
AND: Message "Préférences sauvegardées" apparaît
WHEN: Utilisateur ferme et rouvre la page
THEN: Les préférences sont toujours sauvegardées
```

**Pour tester**:
1. Profile → Notification Preferences (trouver le lien)
2. Toggle "Email - New Message"
3. Vérifier que toggle change en UI
4. Attendre 2 sec, rafraîchir page
5. Vérifier que setting persiste

---

## Step 4.5: Git Commit de tous les changements

⏱️ **Temps**: 15 min

```bash
cd ~/Desktop/Habynex

# 1. Vérifier status
git status

# 2. Staged tous les changements
git add -A

# 3. Commit avec message descriptif
git commit -m "🔧 Complete cleanup: SQL consolidation + frontend fixes

- Phase 1: Consolidated notification tables, removed orphaned tables
- Phase 2: Strict TypeScript + ESLint enabled  
- Phase 3: Fixed hook APIs, removed duplication, simplified hooks
- Phase 4: Full test suite passing

BREAKING: Removed pushNotifications.ts service (merged into hook)
MIGRATION: Reorganized database schema (see PLAN_EXECUTION_COMPLET.md)

Closes: Cleanup phase completion"

# 4. Vérifier commit
git log -1
```

---

# ✅ LIVRAISON FINALE

## Checklist Complète

- [ ] **PHASE 1**: SQL Cleanup
  - [ ] user_push_tokens supprimée
  - [ ] property_embeddings créée
  - [ ] base-recommandation.sql nettoyée
  - [ ] notification_preferences & notification_history consolidées
  - [ ] trust_score unifié (V3 seulement)
  - [ ] `supabase db push` sans erreurs

- [ ] **PHASE 2**: Configuration
  - [ ] tsconfig.json: strict mode activé
  - [ ] eslint.config.js: rules activées
  - [ ] `npx tsc --noEmit`: zéro erreurs

- [ ] **PHASE 3**: Frontend Refactor
  - [ ] usePushNotifications hook API fixed
  - [ ] pushNotifications.ts merger ou supprimé
  - [ ] NotificationPreferencesPanel fixed
  - [ ] useRecommendations simplifiée
  - [ ] `npm run lint`: zéro erreurs

- [ ] **PHASE 4**: Tests
  - [ ] `npm run build`: OK
  - [ ] Push notifications E2E: OK
  - [ ] Recommandations E2E: OK
  - [ ] Préférences notifications E2E: OK
  - [ ] Git commit: Fait

---

## Documents Créés

📄 **Ce Plan d'Exécution** (ce fichier)
📄 **DOCUMENTATION_COMPLETE.md** (analyse détaillée)
📄 **TYPESCRIPT_ERRORS.txt** (rapport d'erreurs)
📄 **ESLINT_ERRORS.txt** (rapport linting)
📄 **DIAGNOSTIC_BD.txt** (diagnostic SQL)

---

## Temps de Travail Résumé

| Phase | Durée | Statut |
|-------|-------|--------|
| Phase 1: SQL Cleanup | 3-4h | ⏳ À faire |
| Phase 2: Configuration | 1h | ⏳ À faire |
| Phase 3: Frontend Refactor | 3-4h | ⏳ À faire |
| Phase 4: Tests | 2-3h | ⏳ À faire |
| **TOTAL** | **10-15h** | ⏳ À faire |

---

## 🚀 PRÊT À COMMENCER?

1. **Répondez aux 3 QUESTIONS CRITIQUES** en haut ⬆️
2. **Faites le DIAGNOSTIC de votre BD** (Step 1.1)
3. **Suivez ce plan étape par étape**
4. **Validez après chaque phase**
5. **Commit après chaque phase réussie**

**Questions?** Consultez:
- DOCUMENTATION_COMPLETE.md pour analyse détaillée
- FRONTEND_AUDIT_COMPLETE.md pour contexte frontend
- Code SQL directement dans les fichiers de migration

---

**Bon courage! 💪 Vous pouvez le faire! 🚀**
