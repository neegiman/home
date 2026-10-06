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
