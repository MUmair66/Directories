-- ─── Geo: keep geography points in sync with lat/lng on every save ───────────
CREATE OR REPLACE FUNCTION set_point_from_lat_lng() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    IF TG_TABLE_NAME = 'businesses' THEN
      NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    ELSE
      NEW.center := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
  ELSIF TG_TABLE_NAME = 'businesses' THEN
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint

CREATE TRIGGER businesses_set_location BEFORE INSERT OR UPDATE OF lat, lng ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_point_from_lat_lng();--> statement-breakpoint
CREATE TRIGGER states_set_center BEFORE INSERT OR UPDATE OF lat, lng ON states
  FOR EACH ROW EXECUTE FUNCTION set_point_from_lat_lng();--> statement-breakpoint
CREATE TRIGGER cities_set_center BEFORE INSERT OR UPDATE OF lat, lng ON cities
  FOR EACH ROW EXECUTE FUNCTION set_point_from_lat_lng();--> statement-breakpoint

CREATE INDEX businesses_location_gist ON businesses USING gist (location);--> statement-breakpoint
CREATE INDEX cities_center_gist ON cities USING gist (center);--> statement-breakpoint

-- ─── Trigram indexes for typo-tolerant search and autocomplete ───────────────
CREATE INDEX businesses_name_trgm ON businesses USING gin (f_unaccent(lower(name)) gin_trgm_ops)
  WHERE status = 'approved' AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX businesses_name_cat_trgm ON businesses USING gin (f_unaccent(lower(name || ' ' || category_names)) gin_trgm_ops)
  WHERE status = 'approved' AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX categories_name_trgm ON categories USING gin (f_unaccent(lower(name)) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX cities_name_trgm ON cities USING gin (f_unaccent(lower(name)) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX businesses_name_prefix ON businesses (lower(name) text_pattern_ops)
  WHERE status = 'approved' AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX cities_name_prefix ON cities (lower(name) text_pattern_ops);--> statement-breakpoint
CREATE INDEX businesses_zip_idx ON businesses (zip) WHERE status = 'approved' AND deleted_at IS NULL;--> statement-breakpoint

-- Partial index for the default public listing order.
CREATE INDEX businesses_public_rank_idx ON businesses (featured DESC, avg_rating DESC, review_count DESC)
  WHERE status = 'approved' AND deleted_at IS NULL;--> statement-breakpoint

-- ─── Denormalized search inputs (feed the generated search_vector) ───────────
CREATE OR REPLACE FUNCTION refresh_business_search(p_id uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE businesses b SET
    category_names = coalesce((
      SELECT string_agg(DISTINCT x.name, ' ') FROM (
        SELECT c.name FROM business_categories bc JOIN categories c ON c.id = bc.category_id WHERE bc.business_id = b.id
        UNION ALL
        SELECT p.name FROM business_categories bc JOIN categories c ON c.id = bc.category_id
          JOIN categories p ON p.id = c.parent_id WHERE bc.business_id = b.id
      ) x), ''),
    tag_text = coalesce((SELECT array_to_string(tags, ' ') FROM business_seo WHERE business_id = b.id), ''),
    city_name = coalesce((SELECT name FROM cities WHERE id = b.city_id), ''),
    state_name = coalesce((SELECT name || ' ' || code FROM states WHERE id = b.state_id), '')
  WHERE b.id = p_id;
$$;--> statement-breakpoint

-- ─── Rating aggregates (called in the same transaction as review writes) ─────
CREATE OR REPLACE FUNCTION refresh_business_rating(p_id uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE businesses b SET
    avg_rating = coalesce(r.avg, 0),
    review_count = coalesce(r.n, 0),
    last_review_at = r.last_at
  FROM (
    SELECT round(avg(rating)::numeric, 2) AS avg, count(*)::int AS n, max(created_at) AS last_at
    FROM reviews WHERE business_id = p_id AND status = 'published' AND deleted_at IS NULL
  ) r
  WHERE b.id = p_id;
$$;--> statement-breakpoint

-- ─── Listing counts per category / state / city / city + category ────────────
-- category_id rolls up children into their parent. Refreshed every 15 minutes by cron.
CREATE MATERIALIZED VIEW listing_counts AS
WITH b AS (
  -- Approved listings always have a state and city; the guard keeps grouping-set rows unique.
  SELECT id, state_id, city_id FROM businesses
  WHERE status = 'approved' AND deleted_at IS NULL AND state_id IS NOT NULL AND city_id IS NOT NULL
),
bc AS (
  SELECT DISTINCT x.business_id, x.category_id FROM (
    SELECT business_id, category_id FROM business_categories
    UNION ALL
    SELECT bc.business_id, c.parent_id FROM business_categories bc
      JOIN categories c ON c.id = bc.category_id WHERE c.parent_id IS NOT NULL
  ) x
)
SELECT NULL::uuid AS category_id, b.state_id, b.city_id, count(*)::int AS total
FROM b GROUP BY GROUPING SETS ((), (b.state_id), (b.state_id, b.city_id))
UNION ALL
SELECT bc.category_id, b.state_id, b.city_id, count(DISTINCT b.id)::int
FROM b JOIN bc ON bc.business_id = b.id
GROUP BY GROUPING SETS ((bc.category_id), (bc.category_id, b.state_id), (bc.category_id, b.state_id, b.city_id));--> statement-breakpoint

CREATE UNIQUE INDEX listing_counts_uidx ON listing_counts (category_id, state_id, city_id) NULLS NOT DISTINCT;--> statement-breakpoint
CREATE INDEX listing_counts_city_idx ON listing_counts (city_id) WHERE city_id IS NOT NULL;
