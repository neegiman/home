ALTER TABLE restaurant
  ADD COLUMN IF NOT EXISTS selection_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE restaurant
  DROP CONSTRAINT IF EXISTS restaurant_selection_count_check;

ALTER TABLE restaurant
  ADD CONSTRAINT restaurant_selection_count_check
  CHECK (selection_count >= 0);

CREATE INDEX IF NOT EXISTS idx_restaurant_selection_count
  ON restaurant (selection_count DESC);
