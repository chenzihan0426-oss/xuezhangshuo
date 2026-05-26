-- ============================================================
-- 继续补充金融行业公司字典
--
-- 0003 加了 27 家,但仍少了 4 类核心金融机构:
--   1) 外资投行(高盛/大摩/JPM/UBS) — 金融顶部不可缺
--   2) 政策性银行(国开行/进出口/农发行) — 校招大户
--   3) 头部城商行(北京/上海/江苏/宁波/南京/杭州) — 起薪不输大行
--   4) 二线券商扩(国信/银河/中泰/长江/光大/东方财富/方正/兴业)
--   5) 互联网银行(微众) + 信托
--
-- 本迁移再补 30+ 家,执行后金融字典总数 ≈ 60 家。
-- 用 WHERE NOT EXISTS 保证幂等,可重复执行。
-- ============================================================

WITH new_companies (name, tier, industry) AS (
  VALUES
    -- 外资投行 / 顶级 PE (T1 — 金融顶部)
    ('高盛',         1, 'finance'),
    ('摩根士丹利',   1, 'finance'),
    ('摩根大通',     1, 'finance'),
    ('瑞银',         1, 'finance'),
    ('高瓴资本',     1, 'finance'),
    ('国家开发银行', 1, 'finance'),
    ('微众银行',     1, 'finance'),

    -- 二线大型券商(应届招聘活跃) (T2)
    ('国信证券',     2, 'finance'),
    ('中国银河',     2, 'finance'),
    ('中泰证券',     2, 'finance'),
    ('长江证券',     2, 'finance'),
    ('光大证券',     2, 'finance'),
    ('方正证券',     2, 'finance'),
    ('东方财富',     2, 'finance'),
    ('兴业证券',     2, 'finance'),

    -- 政策性银行 (T2 — 公务员气质强,薪酬稳)
    ('中国进出口银行',     2, 'finance'),
    ('中国农业发展银行',   2, 'finance'),

    -- 头部城商行 (T2 — 起薪在一线城市不输股份行)
    ('北京银行',     2, 'finance'),
    ('上海银行',     2, 'finance'),
    ('江苏银行',     2, 'finance'),
    ('宁波银行',     2, 'finance'),
    ('南京银行',     2, 'finance'),
    ('杭州银行',     2, 'finance'),

    -- 股份行扩 (T2)
    ('广发银行',     2, 'finance'),
    ('华夏银行',     2, 'finance'),

    -- 保险扩 (T2)
    ('中国人保',     2, 'finance'),
    ('泰康保险',     2, 'finance'),
    ('友邦保险',     2, 'finance'),
    ('阳光保险',     2, 'finance'),

    -- 公募基金扩 (T2)
    ('富国基金',     2, 'finance'),
    ('博时基金',     2, 'finance'),
    ('招商基金',     2, 'finance'),
    ('工银瑞信',     2, 'finance'),
    ('建信基金',     2, 'finance'),

    -- 互联网金融 / 支付 / 信托 (T2)
    ('京东金融',     2, 'finance'),
    ('度小满金融',   2, 'finance'),
    ('中信信托',     2, 'finance'),
    ('平安信托',     2, 'finance')
)
INSERT INTO companies (name, tier, industry)
SELECT n.name, n.tier, n.industry
FROM new_companies n
WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = n.name);
