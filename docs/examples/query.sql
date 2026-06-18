CREATE TABLE readings (
  id INTEGER PRIMARY KEY,
  sensor TEXT NOT NULL,
  celsius REAL NOT NULL,
  captured_at TEXT NOT NULL
);

SELECT sensor, ROUND(AVG(celsius), 2) AS avg_celsius
FROM readings
WHERE captured_at >= '2026-01-01'
GROUP BY sensor
ORDER BY avg_celsius DESC;
