-- ============================================================
-- 性能补丁:匹配热路径索引
-- 之前只有 (first_company_id, first_position_category, first_level)
-- 当用户填字典外公司(company_id = 0)时,走 company_tier / position 路径
-- 没有合适索引,大数据量下会全表扫描。
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_senior_position_level_k
  ON senior_paths (first_position_category, first_level, k_anonymity);

CREATE INDEX IF NOT EXISTS idx_senior_tier_position_level
  ON senior_paths (first_company_tier, first_position_category, first_level)
  WHERE k_anonymity >= 1000;
