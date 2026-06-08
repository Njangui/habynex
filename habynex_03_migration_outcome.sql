-- ============================================================
-- HABYNEX — Migration 03 : Outcome visites
-- Ajouter les colonnes de confirmation agent + client
-- ============================================================

ALTER TABLE visit_bookings
  ADD COLUMN IF NOT EXISTS outcome               text CHECK (outcome IN ('success','failure')),
  ADD COLUMN IF NOT EXISTS chosen_listing_id     uuid REFERENCES listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_outcome        text CHECK (client_outcome IN ('success','failure')),
  ADD COLUMN IF NOT EXISTS client_chosen_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_bookings_outcome ON visit_bookings(outcome) WHERE outcome IS NOT NULL;

-- Vue utile pour l'admin : missions à traiter
CREATE OR REPLACE VIEW admin_pending_commissions AS
SELECT
  vb.id            AS booking_id,
  vb.agent_id,
  vb.chosen_listing_id,
  vb.client_chosen_listing_id,
  vb.outcome,
  vb.client_outcome,
  vb.scheduled_at,
  p.full_name      AS agent_name,
  l.title          AS listing_title,
  l.price          AS listing_price,
  a.commission_model,
  CASE a.commission_model
    WHEN 'A' THEN ROUND(l.price * 0.15)
    WHEN 'B' THEN ROUND(l.price * 0.20)
  END              AS suggested_agent_amount
FROM visit_bookings vb
JOIN agents a ON a.id = vb.agent_id
JOIN profiles p ON p.id = vb.agent_id
LEFT JOIN listings l ON l.id = vb.chosen_listing_id
WHERE vb.outcome = 'success'
  AND vb.client_outcome = 'success'
  AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.booking_id = vb.id);

COMMENT ON VIEW admin_pending_commissions IS
  'Missions réussies (agent + client) sans commission encore créée.';
