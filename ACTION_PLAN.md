# 🎯 ACTION PLAN - HABYNEX EXECUTION GUIDE

**Status**: 🟡 BLOCKED - Attendre réponses aux 3 questions critiques  
**Approx. Duration**: 12 heures  
**Difficulty**: HIGH (DB cleanup + Code refactor)  
**Risk Level**: MEDIUM (Requires careful ordering)  

---

# ⚠️ 3 QUESTIONS CRITIQUES À RÉPONDRE AVANT PHASE 1

### Q1: Migration Execution Order ⏰ **CRITICAL**
```
IN SUPABASE: Does base.sql execute BEFORE or AFTER dated migrations?
```

**Why Critical**:
- Si base.sql exécute APRÈS `20260114205420`, la table `notification_preferences` est recréée
- Colonnes ajoutées via `20260303032255` (push_new_review, etc.) **DISPARAISSENT**
- Code crash lors de l'accès

**Options**:
A) base.sql exécute FIRST (safely)
B) base.sql exécute LAST (tables overwritten)  
C) base.sql n'exécute pas (dated migrations only)

**Action Required**: 
Vérifier config Supabase ou faire test rapide

---

### Q2: Existing Data in Orphaned Tables 💾 **CRITICAL**
```
DO WE HAVE DATA IN:
  - push_subscriptions (utilisée) → KEEP
  - user_push_tokens (orpheline) → KEEP or DELETE?
  - property_embeddings (manquante) → N/A (doesn't exist)
```

**Why Critical**:
Migration strategy dépend si on a data à préserver

**Options**:
A) push_subscriptions vide → Simple delete+recreate
B) push_subscriptions has data → Need to MIGRATE
C) user_push_tokens has data → Need to BACKUP before delete

**Action Required**:
```sql
SELECT COUNT(*) FROM push_subscriptions;       -- How many?
SELECT COUNT(*) FROM user_push_tokens;         -- Any data?
SELECT * FROM notification_preferences LIMIT 5; -- Which columns exist now?
```

---

### Q3: Active trust_score Version? 🧮 **CRITICAL**
```
WHICH VERSION IS CURRENTLY ACTIVE IN PRODUCTION?
  V1: 20260103095428 (simple +15/+25/+30/+40 formula)
  V2: 20260104005756 (incomplete, don't use)
  V3: 20260112100436 (complex, v1 overwritten)
```

**Why Critical**:
- Need to know which formula is ACTUALLY being used
- V1 and V2 must be deleted, but need to ensure V3 is correct

**How to Find**:
```sql
SELECT routine_name, routine_definition FROM information_schema.routines 
WHERE routine_name LIKE '%trust%';

-- Check which trigger is ACTIVE:
SELECT tgname, tgfoid FROM pg_trigger WHERE tgname LIKE '%trust%';
```

**Action Required**:
Verify V3 is active and formula is correct

---

# 👉 PHASE 1: SQL CLEANUP (Once Q1, Q2, Q3 answered)

## Step 1.1: Consolidate notification_preferences & notification_history

**Checkpoint**: Deux migrations créent la même table → une seule doit exister
**Fichiers affectés**: 
- base.sql (KEEPER)
- 20260114205420_841a859a-6fdf-4257-9de6-c8c49df36f91.sql (SUPPRIMER duplication)
- 20260303032255_29b95380-8a34-4b5e-8f2e-ce049309c923.sql (ADAPTER)

**Status**: ⏳ PENDING - Awaiting Q1

---

### P1.2 - Supprimer user_push_tokens (ORPHELINE)
**Checkpoint**: Table inutilisée, code utilise push_subscriptions
**Fichiers affectés**:
- 20260220041127_7d28b3b1-4daf-4759-b9ba-94dba7bd9496.sql (SUPPRIMER INTÉGRALEMENT)
- 20260303032255_29b95380-8a34-4b5e-8f2e-ce049309c923.sql (Enlever ALTERs pour user_push_tokens)

**Status**: ⏳ PENDING - See Step 1.2 in DOCUMENTATION_COMPLETE.md

---

### P1.3 - Créer property_embeddings (TABLE MANQUANTE)
**Checkpoint**: Deno function recommend-properties utilise mais table n'existe pas

**Status**: ⏳ PENDING - See Step 1.3 in DOCUMENTATION_COMPLETE.md

---

### P1.4 - Nettoyer base-recommandation.sql
**Checkpoint**: 4 tables créées 3x chacune

**Status**: ⏳ PENDING - See Step 1.4 in DOCUMENTATION_COMPLETE.md

---

### P1.5 - Unifier trust_score calculation
**Checkpoint**: 3 versions différentes de logique

**Status**: ⏳ PENDING - Awaiting Q3

---

## ⚡ PHASE 2: STRICT MODE TYPESCRIPT & LINTING (30 min)

### P2.1 - Activer strict mode TypeScript
**Checkpoint**: TypeScript compilation stricte
**Fichiers affectés**: [tsconfig.json](tsconfig.json)

**Action**:
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "noUnusedParameters": true,
    "noUnusedLocals": true,
    "strictNullChecks": true,
    "strict": true
  }
}
```
**Status**: ⏳ PENDING

---

### P2.2 - Activer ESLint strict rules
**Checkpoint**: Dead code detection
**Fichiers affectés**: [eslint.config.js](eslint.config.js)

**Action**:
```javascript
{
  "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
  "no-unused-imports": "error"
}
```
**Status**: ⏳ PENDING

---

## 🔧 PHASE 3: REFACTOR FRONTEND (4-6 heures)

### P3.1 - Merger pushNotifications.ts INSIDE usePushNotifications.ts
**Checkpoint**: Consolider la logique de push notifications
**Fichiers affectés**:
- [src/hooks/usePushNotifications.ts](src/hooks/usePushNotifications.ts)
- [src/services/pushNotifications.ts](src/services/pushNotifications.ts) (SUPPRIMER après merger)

**Status**: ⏳ PENDING

---

### P3.2 - Audit useRecommendations.ts vs recommend-properties Deno
**Checkpoint**: Identificer la duplication de logique
**Fichiers affectés**:
- [src/hooks/useRecommendations.ts](src/hooks/useRecommendations.ts)
- [supabase/functions/recommend-properties/index.ts](supabase/functions/recommend-properties/index.ts)

**Status**: ⏳ PENDING

---

## ✅ PHASE 4: VALIDATION & TESTS (2 heures)

### P4.1 - Build production
**Command**: `npm run build`
**Expected**: Zero errors

**Status**: ⏳ PENDING

---

### P4.2 - Lint check
**Command**: `npm run lint`
**Expected**: Zero warnings

**Status**: ⏳ PENDING

---

### P4.3 - TypeScript strict check
**Command**: `npx tsc --noEmit`
**Expected**: Zero errors

**Status**: ⏳ PENDING

---

### P4.4 - Test E2E Push Notifications
**Checklist**:
- [ ] User can request notification permission
- [ ] User can subscribe to push
- [ ] Badge updates on notification
- [ ] Can unsubscribe

**Status**: ⏳ PENDING

---

### P4.5 - Test E2E Recommendations
**Checklist**:
- [ ] useRecommendations hook works
- [ ] Recommendations display in UI
- [ ] property_embeddings table populated

**Status**: ⏳ PENDING

---

## 📊 TIMELINE ESTIMÉE

| Phase | Durée | Cumulative |
|-------|-------|-----------|
| Phase 1 | 2-3h | 2-3h |
| Phase 2 | 0.5h | 2.5-3.5h |
| Phase 3 | 4-6h | 6.5-9.5h |
| Phase 4 | 2h | 8.5-11.5h |
| **TOTAL** | | **~12 heures** |

---

## ⚠️ BLOCKERS À CLARIFIER AVANT DÉMARRAGE

**AWAITING ANSWERS**:
1. Q1: Migration Execution Order?
2. Q2: Existing Data (push_subscriptions, user_push_tokens)?
3. Q3: Active trust_score Version?

Once answered → Proceed to PHASE 1

---

## 📞 FULL DETAILS

For complete migration code, detailed explanations, and step-by-step instructions, see:
**[DOCUMENTATION_COMPLETE.md](DOCUMENTATION_COMPLETE.md)**


