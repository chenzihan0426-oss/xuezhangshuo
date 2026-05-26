-- ============================================================
-- 修正/补充金融行业公司字典
--
-- 问题:
--   1) 中信证券原标 tier=2(独角兽),与头部券商身份不符,应为 T1
--   2) 工商银行原标 tier=5(国企),作为头部金融机构应为 T2
--   3) 整个 finance 行业字典只有 3 家,严重不足
--
-- 解决:
--   A) UPDATE 修正错误 tier
--   B) INSERT 补充 头部券商 / 银行 / 保险 / 基金 / 互联网金融 共 25 家
--      (companies.name 没有 UNIQUE 约束,用 WHERE NOT EXISTS 避免重复)
--
-- tier 体系(跨行业可比):
--   1 = 一线 / 行业顶部 — 互联网 BAT/字节、头部券商投行、招行平安、MBB
--   2 = 头部 / 独角兽   — 二线互联网、二线券商、股份行、保险/基金头部
--   3 = 普通公司
--   ...
-- ============================================================

-- A) 修正存量公司分级
UPDATE companies SET tier = 1 WHERE name = '中信证券';
UPDATE companies SET tier = 1 WHERE name = '招商银行';
UPDATE companies SET tier = 2 WHERE name = '工商银行';

-- B) 补充金融行业头部公司 (重复执行幂等)
WITH new_companies (name, tier, industry) AS (
  VALUES
    -- 头部券商 / 投行 (T1)
    ('中金公司',     1, 'finance'),
    ('中信建投',     1, 'finance'),
    -- 二线大型券商 (T2)
    ('华泰证券',     2, 'finance'),
    ('海通证券',     2, 'finance'),
    ('国泰君安',     2, 'finance'),
    ('招商证券',     2, 'finance'),
    ('申万宏源',     2, 'finance'),
    ('广发证券',     2, 'finance'),
    ('东方证券',     2, 'finance'),
    -- 国有大行 (T2,头部但薪资偏稳)
    ('建设银行',     2, 'finance'),
    ('农业银行',     2, 'finance'),
    ('中国银行',     2, 'finance'),
    ('交通银行',     2, 'finance'),
    -- 全国性股份行 (T2)
    ('平安银行',     2, 'finance'),
    ('兴业银行',     2, 'finance'),
    ('浦发银行',     2, 'finance'),
    ('民生银行',     2, 'finance'),
    ('光大银行',     2, 'finance'),
    -- 保险头部 (T1/T2)
    ('中国平安',     1, 'finance'),
    ('中国人寿',     2, 'finance'),
    ('中国太保',     2, 'finance'),
    ('新华保险',     2, 'finance'),
    -- 公募基金头部 (T2)
    ('易方达基金',   2, 'finance'),
    ('华夏基金',     2, 'finance'),
    ('嘉实基金',     2, 'finance'),
    ('南方基金',     2, 'finance'),
    ('汇添富基金',   2, 'finance'),
    ('广发基金',     2, 'finance'),
    -- 互联网金融 (T1/T2)
    ('蚂蚁集团',     1, 'finance'),
    ('陆金所',       2, 'finance')
)
INSERT INTO companies (name, tier, industry)
SELECT n.name, n.tier, n.industry
FROM new_companies n
WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = n.name);
