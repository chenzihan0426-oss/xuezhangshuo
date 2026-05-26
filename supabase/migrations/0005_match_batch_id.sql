-- ============================================================
-- matches 加 batch_id —— 把"一次提交的 N 个 offer"严格归到同一组
--
-- 问题:
--   原来 batch API 用 created_at ±10s 窗口圈同次提交,跨次提交时间相近
--   或 zombie 自愈触发时会误圈,导致结果页"对比"看到比实际多的 offer。
--
-- 改动:
--   1) matches 加 batch_id UUID 字段(nullable,老数据为 NULL,API 端 fallback)
--   2) 索引 (user_id, batch_id) 让 batch 查询走索引
-- ============================================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_matches_user_batch ON matches(user_id, batch_id);
