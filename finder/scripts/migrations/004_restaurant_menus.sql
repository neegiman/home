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

-- 현재 MVP의 식당은 샘플이므로 가격과 열량도 교체 가능한 샘플 데이터로 넣습니다.
INSERT INTO restaurant_menu (
  restaurant_id,
  name,
  price_won,
  calories_min,
  calories_max,
  price_source,
  calorie_source,
  is_representative,
  display_order
)
SELECT
  r.id,
  CASE r.category_code
    WHEN 'KOREAN' THEN CASE menu.display_order WHEN 1 THEN '한식 정식' ELSE '김치찌개' END
    WHEN 'CHINESE' THEN CASE menu.display_order WHEN 1 THEN '짜장면' ELSE '짬뽕' END
    WHEN 'JAPANESE' THEN CASE menu.display_order WHEN 1 THEN '돈카츠' ELSE '냉소바' END
    WHEN 'WESTERN' THEN CASE menu.display_order WHEN 1 THEN '토마토 파스타' ELSE '리조또' END
    WHEN 'ASIAN' THEN CASE menu.display_order WHEN 1 THEN '소고기 쌀국수' ELSE '팟타이' END
    WHEN 'FAST_FOOD' THEN CASE menu.display_order WHEN 1 THEN '버거 세트' ELSE '치킨 메뉴' END
    WHEN 'SNACK' THEN CASE menu.display_order WHEN 1 THEN '떡볶이' ELSE '김밥' END
    ELSE CASE menu.display_order WHEN 1 THEN '샤브샤브' ELSE '칼국수' END
  END,
  CASE r.category_code
    WHEN 'KOREAN' THEN CASE menu.display_order WHEN 1 THEN 10000 ELSE 9000 END
    WHEN 'CHINESE' THEN CASE menu.display_order WHEN 1 THEN 7000 ELSE 9000 END
    WHEN 'JAPANESE' THEN CASE menu.display_order WHEN 1 THEN 12000 ELSE 10000 END
    WHEN 'WESTERN' THEN CASE menu.display_order WHEN 1 THEN 14000 ELSE 15000 END
    WHEN 'ASIAN' THEN CASE menu.display_order WHEN 1 THEN 11000 ELSE 13000 END
    WHEN 'FAST_FOOD' THEN CASE menu.display_order WHEN 1 THEN 9500 ELSE 19000 END
    WHEN 'SNACK' THEN CASE menu.display_order WHEN 1 THEN 5000 ELSE 4000 END
    ELSE CASE menu.display_order WHEN 1 THEN 15000 ELSE 9000 END
  END,
  CASE r.category_code
    WHEN 'KOREAN' THEN CASE menu.display_order WHEN 1 THEN 650 ELSE 450 END
    WHEN 'CHINESE' THEN CASE menu.display_order WHEN 1 THEN 650 ELSE 600 END
    WHEN 'JAPANESE' THEN CASE menu.display_order WHEN 1 THEN 750 ELSE 450 END
    WHEN 'WESTERN' THEN CASE menu.display_order WHEN 1 THEN 650 ELSE 700 END
    WHEN 'ASIAN' THEN CASE menu.display_order WHEN 1 THEN 450 ELSE 700 END
    WHEN 'FAST_FOOD' THEN CASE menu.display_order WHEN 1 THEN 800 ELSE 900 END
    WHEN 'SNACK' THEN CASE menu.display_order WHEN 1 THEN 400 ELSE 350 END
    ELSE CASE menu.display_order WHEN 1 THEN 500 ELSE 500 END
  END,
  CASE r.category_code
    WHEN 'KOREAN' THEN CASE menu.display_order WHEN 1 THEN 850 ELSE 650 END
    WHEN 'CHINESE' THEN CASE menu.display_order WHEN 1 THEN 850 ELSE 800 END
    WHEN 'JAPANESE' THEN CASE menu.display_order WHEN 1 THEN 950 ELSE 650 END
    WHEN 'WESTERN' THEN CASE menu.display_order WHEN 1 THEN 850 ELSE 900 END
    WHEN 'ASIAN' THEN CASE menu.display_order WHEN 1 THEN 650 ELSE 900 END
    WHEN 'FAST_FOOD' THEN CASE menu.display_order WHEN 1 THEN 1100 ELSE 1300 END
    WHEN 'SNACK' THEN CASE menu.display_order WHEN 1 THEN 600 ELSE 500 END
    ELSE CASE menu.display_order WHEN 1 THEN 750 ELSE 700 END
  END,
  'SAMPLE',
  'MFDS_ESTIMATE',
  menu.display_order = 1,
  menu.display_order
FROM restaurant AS r
CROSS JOIN (VALUES (1), (2)) AS menu(display_order)
ON CONFLICT (restaurant_id, display_order) DO NOTHING;
