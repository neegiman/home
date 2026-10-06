WITH center_point AS (
  SELECT ST_SetSRID(ST_MakePoint(127.1297, 37.5944), 4326)::geography AS location
)
SELECT
  radius_m,
  COUNT(restaurant.id) AS open_restaurant_count
FROM (VALUES (500), (1000), (1500)) AS radii(radius_m)
CROSS JOIN center_point
LEFT JOIN restaurant
  ON restaurant.business_status = 'OPEN'
  AND ST_DWithin(restaurant.location, center_point.location, radii.radius_m)
GROUP BY radius_m
ORDER BY radius_m;

SELECT
  category_code,
  COUNT(*) AS restaurant_count
FROM restaurant
CROSS JOIN (
  SELECT ST_SetSRID(ST_MakePoint(127.1297, 37.5944), 4326)::geography AS location
) AS center_point
WHERE business_status = 'OPEN'
  AND ST_DWithin(restaurant.location, center_point.location, 1500)
GROUP BY category_code
ORDER BY category_code;
