CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS restaurant (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category_code VARCHAR(20) NOT NULL
    CHECK (category_code IN (
      'KOREAN', 'CHINESE', 'JAPANESE', 'WESTERN',
      'ASIAN', 'FAST_FOOD', 'SNACK'
    )),
  category_name VARCHAR(20) NOT NULL,
  road_address VARCHAR(255) NOT NULL,
  business_status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (business_status IN ('OPEN', 'CLOSED')),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location geography(Point, 4326) NOT NULL,
  selection_count INTEGER NOT NULL DEFAULT 0 CHECK (selection_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE restaurant
  ADD COLUMN IF NOT EXISTS selection_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE restaurant
  DROP CONSTRAINT IF EXISTS restaurant_selection_count_check;

ALTER TABLE restaurant
  ADD CONSTRAINT restaurant_selection_count_check
  CHECK (selection_count >= 0);

ALTER TABLE restaurant
  DROP CONSTRAINT IF EXISTS restaurant_category_code_check;

ALTER TABLE restaurant
  ADD CONSTRAINT restaurant_category_code_check
  CHECK (category_code IN (
    'KOREAN', 'CHINESE', 'JAPANESE', 'WESTERN',
    'ASIAN', 'FAST_FOOD', 'SNACK'
  ));

CREATE INDEX IF NOT EXISTS idx_restaurant_location
  ON restaurant USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_restaurant_category_code
  ON restaurant (category_code);

CREATE INDEX IF NOT EXISTS idx_restaurant_business_status
  ON restaurant (business_status);

CREATE INDEX IF NOT EXISTS idx_restaurant_selection_count
  ON restaurant (selection_count DESC);

CREATE TABLE IF NOT EXISTS restaurant_menu (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL
    REFERENCES restaurant(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  price_won INTEGER CHECK (price_won IS NULL OR price_won >= 0),
  calories_min INTEGER CHECK (calories_min IS NULL OR calories_min >= 0),
  calories_max INTEGER CHECK (calories_max IS NULL OR calories_max >= 0),
  price_source VARCHAR(24) NOT NULL DEFAULT 'SAMPLE'
    CHECK (price_source IN ('SAMPLE', 'PUBLIC_DATA', 'RESTAURANT', 'ADMIN')),
  calorie_source VARCHAR(24) NOT NULL DEFAULT 'MFDS_ESTIMATE'
    CHECK (calorie_source IN ('MFDS_ESTIMATE', 'PUBLIC_DATA', 'RESTAURANT', 'ADMIN')),
  checked_at DATE,
  is_representative BOOLEAN NOT NULL DEFAULT FALSE,
  display_order SMALLINT NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    calories_min IS NULL
    OR calories_max IS NULL
    OR calories_max >= calories_min
  ),
  UNIQUE (restaurant_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_menu_restaurant
  ON restaurant_menu (restaurant_id, is_representative DESC, display_order ASC);

CREATE TABLE IF NOT EXISTS restaurant_selection_event (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL
    REFERENCES restaurant(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_selection_event_selected_at
  ON restaurant_selection_event (selected_at DESC);

CREATE INDEX IF NOT EXISTS idx_restaurant_selection_event_restaurant_date
  ON restaurant_selection_event (restaurant_id, selected_at DESC);
