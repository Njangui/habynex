-- Table pour les feedbacks
CREATE TABLE feedback_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  property_id uuid REFERENCES properties(id),
  event_type text CHECK (event_type IN ('view', 'favorite', 'contact', 'visit', 'rent', 'dismiss')),
  value numeric,
  context jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Table pour les features utilisateur (feature store)
CREATE TABLE user_features (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  city text,
  budget_min numeric,
  budget_max numeric,
  preferred_property_types text[],
  preferred_neighborhoods text[],
  preferred_listing_types text[],
  preferred_amenities text[],
  move_in_timeline text,
  user_type text,
  segment text DEFAULT 'default',
  updated_at timestamptz DEFAULT now()
);

-- Table pour les statistiques globales
CREATE TABLE recommendation_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_type text,
  date date,
  data jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Table pour les logs de recommandation
CREATE TABLE recommendation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid,
  user_id uuid,
  timestamp timestamptz DEFAULT now(),
  context jsonb,
  weights_used jsonb,
  results_count integer,
  top_scores numeric[],
  processing_time_ms integer
);

-- Index pour performance
CREATE INDEX idx_feedback_user ON feedback_events(user_id, timestamp DESC);
CREATE INDEX idx_feedback_property ON feedback_events(property_id);
CREATE INDEX idx_feedback_event_type ON feedback_events(event_type, timestamp DESC);-- Table pour les feedbacks
CREATE TABLE feedback_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  property_id uuid REFERENCES properties(id),
  event_type text CHECK (event_type IN ('view', 'favorite', 'contact', 'visit', 'rent', 'dismiss')),
  value numeric,
  context jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Table pour les features utilisateur (feature store)
CREATE TABLE user_features (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  city text,
  budget_min numeric,
  budget_max numeric,
  preferred_property_types text[],
  preferred_neighborhoods text[],
  preferred_listing_types text[],
  preferred_amenities text[],
  move_in_timeline text,
  user_type text,
  segment text DEFAULT 'default',
  updated_at timestamptz DEFAULT now()
);
