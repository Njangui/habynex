-- ================================================================
-- HABYNEX — Données de test Supabase
-- Insérer dans l'éditeur SQL Supabase après avoir exécuté le schéma
-- ================================================================

-- ── 1. Quartiers de lancement (si pas encore insérés) ──────────
-- (Vérifier d'abord avec : SELECT * FROM neighborhoods;)

-- ── 2. Annonces de test ────────────────────────────────────────

DO $$
DECLARE
  v_simbock_id   uuid;
  v_jouvence_id  uuid;
  v_biyem_id     uuid;
  v_tkc_id       uuid;
  v_listing_1    uuid;
  v_listing_2    uuid;
  v_listing_3    uuid;
  v_listing_4    uuid;
  v_listing_5    uuid;
  v_listing_6    uuid;

BEGIN
  -- Récupérer les IDs des quartiers
  SELECT id INTO v_simbock_id  FROM neighborhoods WHERE slug = 'simbock'    LIMIT 1;
  SELECT id INTO v_jouvence_id FROM neighborhoods WHERE slug = 'jouvence'   LIMIT 1;
  SELECT id INTO v_biyem_id    FROM neighborhoods WHERE slug = 'biyem-assi' LIMIT 1;
  SELECT id INTO v_tkc_id      FROM neighborhoods WHERE slug = 'tkc'        LIMIT 1;

  -- ── Annonce 1 : Studio meublé Simbock ──────────────────────
  INSERT INTO listings (
    slug, title, description, type, transaction, price, price_negotiable,
    neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2, furnished,
    status, published_at, ai_generated,
    amenities, meta_title, meta_description
  ) VALUES (
    'studio-meubl-simbock-65000-fcfa',
    'Studio moderne meublé — Simbock',
    'Beau studio entièrement meublé et équipé au cœur de Simbock. Cuisine moderne, Wi-Fi inclus, sécurisé 24h/24. Idéal pour étudiant ou jeune professionnel. Eau et électricité disponibles en permanence.',
    'studio', 'furnished', 65000, false,
    v_simbock_id, 3.8291, 11.5012,
    1, 1, 28, true,
    'published', now(), true,
    '{"wifi":true,"security":true,"water_24h":true,"electricity":true,"parking":false}',
    'Studio meublé à Simbock Yaoundé — 65 000 FCFA/mois | Habynex',
    'Studio meublé et équipé à Simbock, Yaoundé. Wi-Fi, eau 24h, sécurisé. 65 000 FCFA/mois.'
  ) RETURNING id INTO v_listing_1;

  -- ── Annonce 2 : Appartement 2 chambres Jouvence ────────────
  INSERT INTO listings (
    slug, title, description, type, transaction, price, price_negotiable,
    neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2, furnished,
    status, published_at, ai_generated, amenities, meta_title, meta_description
  ) VALUES (
    'appartement-2-chambres-jouvence-120000-fcfa',
    'Appartement 2 chambres — Jouvence, Yaoundé',
    'Spacieux appartement de 2 chambres à Jouvence. Séjour lumineux, cuisine équipée, 2 salles de bain. Quartier calme, proche commerces et transports. Immeuble sécurisé avec gardien. Non meublé — libre immédiatement.',
    'apartment', 'rent', 120000, true,
    v_jouvence_id, 3.8350, 11.5080,
    2, 2, 75, false,
    'published', now(), true,
    '{"wifi":false,"security":true,"water_24h":true,"electricity":true,"parking":true,"generator":false}',
    'Appartement 2 chambres à Jouvence Yaoundé — 120 000 FCFA/mois | Habynex',
    'Appartement spacieux 2 chambres à Jouvence, Yaoundé. Sécurisé, parking. 120 000 FCFA/mois négociable.'
  ) RETURNING id INTO v_listing_2;

  -- ── Annonce 3 : Chambre meublée Biyem-Assi ────────────────
  INSERT INTO listings (
    slug, title, description, type, transaction, price,
    neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2, furnished,
    status, published_at, ai_generated, amenities
  ) VALUES (
    'chambre-meubl-biyem-assi-35000-fcfa',
    'Grande chambre meublée — Biyem-Assi',
    'Chambre moderne et meublée dans une résidence calme de Biyem-Assi. Salle de bain privée, accès Wi-Fi, cadre verdoyant. Idéale pour étudiant(e) ou personne seule. Charges comprises.',
    'room', 'furnished', 35000,
    v_biyem_id, 3.8420, 11.4950,
    1, 1, 18, true,
    'published', now(), true,
    '{"wifi":true,"security":true,"water_24h":false,"electricity":true}'
  ) RETURNING id INTO v_listing_3;

  -- ── Annonce 4 : Villa TKC ─────────────────────────────────
  INSERT INTO listings (
    slug, title, description, type, transaction, price, price_negotiable,
    neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2, furnished,
    status, published_at, ai_generated, amenities
  ) VALUES (
    'villa-4-chambres-tkc-yaounde-350000',
    'Villa 4 chambres avec jardin — TKC',
    'Magnifique villa de 4 chambres avec grand jardin à TKC. Double salon, cuisine américaine, 3 salles de bain, garage 2 voitures. Générateur, forage, enceinte clôturée. Idéale pour famille.',
    'villa', 'rent', 350000, true,
    v_tkc_id, 3.8310, 11.5150,
    4, 3, 220, false,
    'published', now(), true,
    '{"wifi":true,"security":true,"water_24h":true,"electricity":true,"parking":true,"generator":true,"garden":true}'
  ) RETURNING id INTO v_listing_4;

  -- ── Annonce 5 : Studio Simbock petit budget ───────────────
  INSERT INTO listings (
    slug, title, description, type, transaction, price,
    neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2, furnished,
    status, published_at, ai_generated, amenities
  ) VALUES (
    'studio-simbock-25000-fcfa-etudiant',
    'Studio étudiant — Simbock, près université',
    'Studio simple et économique à Simbock, à 10 min à pied de l''université. Eau et électricité disponibles. Cadre calme, idéal pour les études. Loyer très abordable, caution 1 mois.',
    'studio', 'rent', 25000,
    v_simbock_id, 3.8285, 11.5008,
    1, 1, 20, false,
    'published', now(), false,
    '{"wifi":false,"security":false,"water_24h":false,"electricity":true}'
  ) RETURNING id INTO v_listing_5;

  -- ── Annonce 6 : Duplex Jouvence vente ─────────────────────
  INSERT INTO listings (
    slug, title, description, type, transaction, price, price_negotiable,
    neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2, furnished,
    status, published_at, ai_generated, amenities
  ) VALUES (
    'duplex-3-chambres-jouvence-vente-25000000',
    'Duplex à vendre — Jouvence, Yaoundé',
    'Beau duplex de 3 chambres à vendre à Jouvence. Construction récente, finitions de qualité, 2 salles de bain modernes. Sécurisé, parking privé. Excellent investissement ou résidence principale.',
    'duplex', 'sale', 25000000, true,
    v_jouvence_id, 3.8355, 11.5085,
    3, 2, 150, false,
    'published', now(), true,
    '{"wifi":false,"security":true,"water_24h":true,"electricity":true,"parking":true}'
  ) RETURNING id INTO v_listing_6;

  -- ── Médias de test (URLs placeholder) ─────────────────────
  -- Dans la réalité ces URLs viennent de Supabase Storage
  -- Remplacez par de vraies URLs d'images immobilières camerounaises

  INSERT INTO listing_media (listing_id, url, type, is_cover, display_order) VALUES
    (v_listing_1, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'image', true, 1),
    (v_listing_1, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'image', false, 2),
    (v_listing_2, 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', 'image', true, 1),
    (v_listing_2, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'image', false, 2),
    (v_listing_2, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'image', false, 3),
    (v_listing_3, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', 'image', true, 1),
    (v_listing_4, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'image', true, 1),
    (v_listing_4, 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800', 'image', false, 2),
    (v_listing_5, 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800', 'image', true, 1),
    (v_listing_6, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'image', true, 1);

  RAISE NOTICE 'Données de test insérées avec succès';
END $$;


-- ── 3. Vérification ────────────────────────────────────────────
SELECT
  l.slug,
  l.title,
  l.type,
  l.transaction,
  l.price,
  l.status,
  n.name AS quartier,
  COUNT(m.id) AS nb_photos
FROM listings l
LEFT JOIN neighborhoods n ON n.id = l.neighborhood_id
LEFT JOIN listing_media m ON m.listing_id = l.id
GROUP BY l.slug, l.title, l.type, l.transaction, l.price, l.status, n.name
ORDER BY l.created_at DESC;


-- ── 4. Requête utile : marquer une annonce comme "vendue/louée" ─
-- UPDATE listings SET status = 'rented' WHERE slug = 'studio-meubl-simbock-65000-fcfa';

-- ── 5. Requête utile : voir les annonces en attente de validation ─
-- SELECT id, title, type, price, created_at FROM listings WHERE status = 'pending_review';
