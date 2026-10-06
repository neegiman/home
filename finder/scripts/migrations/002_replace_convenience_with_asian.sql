ALTER TABLE restaurant
  DROP CONSTRAINT IF EXISTS restaurant_category_code_check;

UPDATE restaurant
SET
  name = CASE id
    WHEN 31 THEN '사이공키친 구리점'
    WHEN 32 THEN '방콕테이블 인창점'
    WHEN 33 THEN '마살라하우스 수택점'
    ELSE name
  END,
  category_code = 'ASIAN',
  category_name = '아시안'
WHERE category_code = 'CONVENIENCE';

ALTER TABLE restaurant
  ADD CONSTRAINT restaurant_category_code_check
  CHECK (category_code IN (
    'KOREAN', 'CHINESE', 'JAPANESE', 'WESTERN',
    'ASIAN', 'FAST_FOOD', 'SNACK'
  ));
