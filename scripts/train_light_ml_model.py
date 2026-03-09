#!/usr/bin/env python3
"""
Script d'entraînement du modèle ML léger pour Habynex
Exécuté automatiquement tous les jours à 2h UTC via GitHub Actions
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score
from supabase import create_client, Client
import joblib

# Configuration depuis les variables d'environnement
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Features utilisées par le modèle
FEATURE_COLUMNS = [
    'price_normalized',
    'surface_normalized',
    'rooms_normalized',
    'budget_diff',
    'city_match',
    'device_mobile',
    'urgency_immediate',
    'is_verified',
    'log_views',
    'photos_count_normalized',
    'embedding_similarity',
    'collaborative_score',
    'recency_days',
    'availability_days'
]

def load_training_data(supabase: Client, days: int = 30) -> pd.DataFrame:
    """
    Charge les données d'entraînement depuis Supabase
    """
    print(f"📊 Chargement des données des {days} derniers jours...")
    
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Récupérer les feedbacks positifs
    positive_feedback = supabase.table('feedback_events')\
        .select('*')\
        .gte('timestamp', start_date)\
        .in_('event_type', ['favorite', 'contact', 'visit', 'rent'])\
        .execute()
    
    # Récupérer les impressions (négatifs implicites)
    impressions = supabase.table('recommendation_logs')\
        .select('*')\
        .gte('timestamp', start_date)\
        .execute()
    
    print(f"✅ Feedbacks positifs: {len(positive_feedback.data)}")
    print(f"👁️  Impressions: {len(impressions.data)}")
    
    # Construire le dataset
    data = []
    
    # Positifs
    for feedback in positive_feedback.data:
        features = extract_features_from_context(feedback.get('context', {}))
        features['label'] = 1
        features['weight'] = get_event_weight(feedback['event_type'])
        data.append(features)
    
    # Négatifs (échantillonnage pour équilibrer)
    negative_samples = min(len(positive_feedback.data) * 3, len(impressions.data))
    if len(impressions.data) > 0:
        sampled_indices = np.random.choice(
            len(impressions.data), 
            size=negative_samples, 
            replace=False
        )
        for idx in sampled_indices:
            impression = impressions.data[idx]
            features = extract_features_from_context(impression.get('context', {}))
            features['label'] = 0
            features['weight'] = 1.0
            data.append(features)
    
    return pd.DataFrame(data)

def extract_features_from_context(context: dict) -> dict:
    """
    Extrait les features normalisées depuis le contexte
    """
    property_data = context.get('property', {})
    user_data = context.get('user', {})
    
    price = property_data.get('price', 0)
    budget_min = user_data.get('budget_min', price * 0.8)
    
    return {
        'price_normalized': np.log1p(price) / 10,
        'surface_normalized': min(property_data.get('surface', 0) / 200, 1),
        'rooms_normalized': min(property_data.get('rooms', 0) / 5, 1),
        'budget_diff': (price - budget_min) / 1000 if budget_min else 0,
        'city_match': 1 if user_data.get('city') == property_data.get('city') else 0,
        'device_mobile': 1 if context.get('device') == 'mobile' else 0,
        'urgency_immediate': 1 if context.get('urgency') == 'immediate' else 0,
        'is_verified': 1 if property_data.get('is_verified') else 0,
        'log_views': np.log1p(property_data.get('view_count', 0)) / 5,
        'photos_count_normalized': min(property_data.get('photos_count', 0) / 10, 1),
        'embedding_similarity': context.get('embedding_similarity', 0.5),
        'collaborative_score': min(context.get('collaborative_score', 0) / 5, 1),
        'recency_days': context.get('days_since_created', 30) / 30,
        'availability_days': context.get('days_until_available', 0) / 30,
    }

def get_event_weight(event_type: str) -> float:
    """
    Pondération selon l'importance de l'événement
    """
    weights = {
        'favorite': 2.0,
        'contact': 3.0,
        'visit': 4.0,
        'rent': 5.0
    }
    return weights.get(event_type, 1.0)

def train_model(df: pd.DataFrame) -> tuple:
    """
    Entraîne le modèle de régression logistique
    """
    print(f"\n🤖 Entraînement sur {len(df)} exemples...")
    
    X = df[FEATURE_COLUMNS].fillna(0)
    y = df['label']
    sample_weights = df['weight']
    
    # Split train/test
    X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
        X, y, sample_weights, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"📚 Train: {len(X_train)} | 🧪 Test: {len(X_test)}")
    
    # Entraînement
    model = LogisticRegression(
        max_iter=1000,
        class_weight='balanced',
        solver='lbfgs',
        C=1.0
    )
    model.fit(X_train, y_train, sample_weight=w_train)
    
    # Évaluation
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'auc_roc': float(roc_auc_score(y_test, y_prob)),
        'training_samples': int(len(X_train)),
        'positive_ratio': float(y.mean()),
        'feature_importance': dict(zip(FEATURE_COLUMNS, model.coef_[0].tolist()))
    }
    
    print(f"\n📈 Résultats:")
    print(f"   Accuracy: {metrics['accuracy']:.3f}")
    print(f"   AUC-ROC: {metrics['auc_roc']:.3f}")
    print(f"\n🔍 Top 5 features importantes:")
    sorted_features = sorted(
        metrics['feature_importance'].items(), 
        key=lambda x: abs(x[1]), 
        reverse=True
    )[:5]
    for feature, importance in sorted_features:
        print(f"   - {feature}: {importance:.4f}")
    
    return model, metrics

def deploy_model(supabase: Client, model, metrics: dict):
    """
    Déploie le modèle entraîné dans Supabase
    """
    print(f"\n🚀 Déploiement du modèle...")
    
    # Extraire les poids (coefficients + intercept)
    weights = model.coef_[0].tolist()
    intercept = model.intercept_[0]
    
    # Sauvegarder dans Supabase
    model_data = {
        'model_name': 'light_ranker',
        'weights': weights + [intercept],  # Dernier élément = intercept
        'version': datetime.now().strftime('%Y%m%d_%H%M%S'),
        'trained_at': datetime.now().isoformat(),
        'metrics': metrics,
        'features': FEATURE_COLUMNS
    }
    
    # Upsert dans la table
    result = supabase.table('ml_model_weights')\
        .upsert(model_data, on_conflict='model_name')\
        .execute()
    
    print(f"✅ Modèle déployé: version {model_data['version']}")
    
    # Sauvegarder localement aussi (backup)
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, f"models/light_ranker_{model_data['version']}.pkl")
    print(f"💾 Backup local: models/light_ranker_{model_data['version']}.pkl")

def main():
    print("=" * 60)
    print("🧠 ENTRAÎNEMENT DU MODÈLE ML HABYNEX")
    print("=" * 60)
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Vérifier les variables d'environnement
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERREUR: Variables d'environnement manquantes!")
        print("   SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis")
        sys.exit(1)
    
    # Connexion Supabase
    print(f"\n🔗 Connexion à Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✅ Connecté")
    
    # Charger les données
    df = load_training_data(supabase, days=30)
    
    if len(df) < 100:
        print(f"\n⚠️  ATTENTION: Pas assez de données ({len(df)} < 100)")
        print("   Entraînement annulé")
        return
    
    print(f"\n📊 Dataset: {len(df)} exemples")
    print(f"   Positifs: {df['label'].sum()} | Négatifs: {len(df) - df['label'].sum()}")
    
    # Entraîner
    model, metrics = train_model(df)
    
    # Déployer
    deploy_model(supabase, model, metrics)
    
    print("\n" + "=" * 60)
    print("✅ ENTRAÎNEMENT TERMINÉ AVEC SUCCÈS")
    print("=" * 60)

if __name__ == "__main__":
    main()