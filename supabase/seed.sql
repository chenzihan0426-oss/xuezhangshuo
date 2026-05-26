-- ============================================================
-- 字典种子数据(供开发环境快速启动)
-- 生产环境推荐用 scripts/seed_dictionaries.py 全量导入
-- ============================================================

-- ============ 学校 ============
INSERT INTO schools (name, tier, province, is_c9, is_985, is_211) VALUES
  ('清华大学',       1, '北京', TRUE, TRUE, TRUE),
  ('北京大学',       1, '北京', TRUE, TRUE, TRUE),
  ('复旦大学',       1, '上海', TRUE, TRUE, TRUE),
  ('上海交通大学',   1, '上海', TRUE, TRUE, TRUE),
  ('浙江大学',       1, '浙江', TRUE, TRUE, TRUE),
  ('南京大学',       1, '江苏', TRUE, TRUE, TRUE),
  ('中国科学技术大学',1, '安徽', TRUE, TRUE, TRUE),
  ('哈尔滨工业大学', 1, '黑龙江', TRUE, TRUE, TRUE),
  ('西安交通大学',   1, '陕西', TRUE, TRUE, TRUE),
  ('武汉大学',       2, '湖北', FALSE, TRUE, TRUE),
  ('华中科技大学',   2, '湖北', FALSE, TRUE, TRUE),
  ('中山大学',       2, '广东', FALSE, TRUE, TRUE),
  ('北京师范大学',   2, '北京', FALSE, TRUE, TRUE),
  ('同济大学',       2, '上海', FALSE, TRUE, TRUE),
  ('北京航空航天大学',2, '北京', FALSE, TRUE, TRUE),
  ('北京理工大学',   2, '北京', FALSE, TRUE, TRUE),
  ('苏州大学',       3, '江苏', FALSE, FALSE, TRUE),
  ('郑州大学',       3, '河南', FALSE, FALSE, TRUE),
  ('暨南大学',       3, '广东', FALSE, FALSE, TRUE),
  ('华南农业大学',   4, '广东', FALSE, FALSE, FALSE),
  ('浙江工业大学',   4, '浙江', FALSE, FALSE, FALSE),
  ('上海大学',       4, '上海', FALSE, FALSE, FALSE),
  ('广东工业大学',   5, '广东', FALSE, FALSE, FALSE),
  ('广州大学',       5, '广东', FALSE, FALSE, FALSE),
  ('武汉工程大学',   5, '湖北', FALSE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- ============ 专业 ============
INSERT INTO majors (name, category) VALUES
  ('计算机科学与技术', 'computer_science'),
  ('软件工程',         'computer_science'),
  ('人工智能',         'computer_science'),
  ('数据科学与大数据', 'computer_science'),
  ('信息安全',         'computer_science'),
  ('工商管理',         'business'),
  ('市场营销',         'business'),
  ('财务管理',         'business'),
  ('会计学',           'business'),
  ('国际经济与贸易',   'business'),
  ('金融学',           'finance'),
  ('经济学',           'finance'),
  ('投资学',           'finance'),
  ('机械工程',         'engineering'),
  ('电子信息工程',     'engineering'),
  ('自动化',           'engineering'),
  ('土木工程',         'engineering'),
  ('化学工程与工艺',   'engineering'),
  ('法学',             'law'),
  ('汉语言文学',       'humanities'),
  ('英语',             'humanities'),
  ('新闻学',           'humanities'),
  ('教育学',           'education'),
  ('设计学类',         'design'),
  ('临床医学',         'medicine')
ON CONFLICT DO NOTHING;

-- ============ 公司(精简头部 + 各类代表)============
INSERT INTO companies (name, tier, industry) VALUES
  ('字节跳动',     1, 'internet'),
  ('阿里巴巴',     1, 'internet'),
  ('腾讯',         1, 'internet'),
  ('美团',         1, 'internet'),
  ('京东',         1, 'internet'),
  ('百度',         1, 'internet'),
  ('华为',         1, 'tech_hardware'),
  ('小米',         1, 'tech_hardware'),
  ('小红书',       2, 'internet'),
  ('滴滴',         2, 'internet'),
  ('Shein',        2, 'internet'),
  ('拼多多',       1, 'internet'),
  ('快手',         2, 'internet'),
  ('B站',          2, 'internet'),
  ('蔚来',         2, 'auto_ev'),
  ('理想汽车',     2, 'auto_ev'),
  ('小鹏',         2, 'auto_ev'),
  -- 金融头部券商 / 投行 (T1)
  ('中信证券',     1, 'finance'),
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
  -- 银行(招行 T1,国有大行 / 全国性股份行 T2)
  ('招商银行',     1, 'finance'),
  ('工商银行',     2, 'finance'),
  ('建设银行',     2, 'finance'),
  ('农业银行',     2, 'finance'),
  ('中国银行',     2, 'finance'),
  ('交通银行',     2, 'finance'),
  ('平安银行',     2, 'finance'),
  ('兴业银行',     2, 'finance'),
  ('浦发银行',     2, 'finance'),
  ('民生银行',     2, 'finance'),
  ('光大银行',     2, 'finance'),
  -- 保险 (T1/T2)
  ('中国平安',     1, 'finance'),
  ('中国人寿',     2, 'finance'),
  ('中国太保',     2, 'finance'),
  ('新华保险',     2, 'finance'),
  -- 公募基金 (T2)
  ('易方达基金',   2, 'finance'),
  ('华夏基金',     2, 'finance'),
  ('嘉实基金',     2, 'finance'),
  ('南方基金',     2, 'finance'),
  ('汇添富基金',   2, 'finance'),
  ('广发基金',     2, 'finance'),
  -- 互联网金融 (T1/T2)
  ('蚂蚁集团',     1, 'finance'),
  ('陆金所',       2, 'finance'),
  -- 外资投行 / 顶级 PE / 政策性银行 / 互联网银行 (T1 顶部)
  ('高盛',         1, 'finance'),
  ('摩根士丹利',   1, 'finance'),
  ('摩根大通',     1, 'finance'),
  ('瑞银',         1, 'finance'),
  ('高瓴资本',     1, 'finance'),
  ('国家开发银行', 1, 'finance'),
  ('微众银行',     1, 'finance'),
  -- 二线大型券商扩 (T2)
  ('国信证券',     2, 'finance'),
  ('中国银河',     2, 'finance'),
  ('中泰证券',     2, 'finance'),
  ('长江证券',     2, 'finance'),
  ('光大证券',     2, 'finance'),
  ('方正证券',     2, 'finance'),
  ('东方财富',     2, 'finance'),
  ('兴业证券',     2, 'finance'),
  -- 政策性银行 (T2)
  ('中国进出口银行',     2, 'finance'),
  ('中国农业发展银行',   2, 'finance'),
  -- 头部城商行 (T2)
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
  -- 互金 / 支付 / 信托 (T2)
  ('京东金融',     2, 'finance'),
  ('度小满金融',   2, 'finance'),
  ('中信信托',     2, 'finance'),
  ('平安信托',     2, 'finance'),
  ('中国移动',     5, 'telecom'),
  ('国家电网',     5, 'energy'),
  ('恒大',         4, 'real_estate'),
  ('万科',         4, 'real_estate'),
  ('新东方',       4, 'education_training'),
  ('好未来',       4, 'education_training'),
  ('普华永道',     2, 'consulting'),
  ('麦肯锡',       2, 'consulting'),
  ('一家不知名创业公司', 7, 'startup')
ON CONFLICT DO NOTHING;

-- ============ 岗位类目 ============
INSERT INTO positions (category, name) VALUES
  ('engineer_backend',      '后端开发'),
  ('engineer_frontend',     '前端开发'),
  ('engineer_mobile',       '移动开发'),
  ('engineer_algorithm',    '算法工程师'),
  ('engineer_data',         '数据工程师'),
  ('product_manager',       '产品经理'),
  ('product_designer',      '产品设计'),
  ('ui_designer',           'UI 设计师'),
  ('content_operation',     '内容运营'),
  ('user_operation',        '用户运营'),
  ('marketing',             '市场营销'),
  ('sales_b2b',             'B2B 销售'),
  ('sales_b2c',             'B2C 销售'),
  ('hr',                    '人力资源'),
  ('finance_analyst',       '财务分析'),
  ('investment_analyst',    '投资分析'),
  ('consultant',            '咨询顾问'),
  ('data_analyst',          '数据分析'),
  ('customer_service',      '客服'),
  ('translation',           '翻译'),
  ('teacher_k12',           'K12 教师'),
  ('civil_servant',         '公务员')
ON CONFLICT DO NOTHING;

-- ============ 环境校正因子:行业景气指数 ============
INSERT INTO environment_factors (factor_type, industry, year, value, notes) VALUES
  ('industry_index', 'internet',           2020, 1.00, '基准年'),
  ('industry_index', 'internet',           2021, 1.10, '疫情线上红利顶峰'),
  ('industry_index', 'internet',           2022, 0.70, '反垄断 + 教育/游戏管控'),
  ('industry_index', 'internet',           2023, 0.50, '大裁员潮'),
  ('industry_index', 'internet',           2024, 0.60, '触底回稳'),
  ('industry_index', 'internet',           2025, 0.65, ''),
  ('industry_index', 'internet',           2026, 0.70, ''),

  ('industry_index', 'finance',            2020, 1.00, ''),
  ('industry_index', 'finance',            2021, 1.00, ''),
  ('industry_index', 'finance',            2022, 0.95, ''),
  ('industry_index', 'finance',            2023, 0.90, '降薪潮'),
  ('industry_index', 'finance',            2024, 0.85, ''),
  ('industry_index', 'finance',            2025, 0.85, ''),
  ('industry_index', 'finance',            2026, 0.85, ''),

  ('industry_index', 'education_training', 2020, 1.00, ''),
  ('industry_index', 'education_training', 2021, 0.30, '双减'),
  ('industry_index', 'education_training', 2022, 0.15, ''),
  ('industry_index', 'education_training', 2023, 0.15, ''),
  ('industry_index', 'education_training', 2024, 0.20, ''),
  ('industry_index', 'education_training', 2025, 0.25, ''),
  ('industry_index', 'education_training', 2026, 0.30, ''),

  ('industry_index', 'real_estate',        2020, 1.00, ''),
  ('industry_index', 'real_estate',        2021, 0.90, '三道红线起步'),
  ('industry_index', 'real_estate',        2022, 0.40, '爆雷潮'),
  ('industry_index', 'real_estate',        2023, 0.30, ''),
  ('industry_index', 'real_estate',        2024, 0.30, ''),
  ('industry_index', 'real_estate',        2025, 0.35, ''),
  ('industry_index', 'real_estate',        2026, 0.40, ''),

  ('industry_index', 'auto_ev',            2020, 0.80, ''),
  ('industry_index', 'auto_ev',            2021, 1.20, '新能源爆发'),
  ('industry_index', 'auto_ev',            2022, 1.30, ''),
  ('industry_index', 'auto_ev',            2023, 1.25, ''),
  ('industry_index', 'auto_ev',            2024, 1.10, '价格战开始'),
  ('industry_index', 'auto_ev',            2025, 1.00, ''),
  ('industry_index', 'auto_ev',            2026, 0.95, '行业整合'),

  ('industry_index', 'tech_hardware',      2020, 1.00, ''),
  ('industry_index', 'tech_hardware',      2021, 1.05, ''),
  ('industry_index', 'tech_hardware',      2022, 1.00, ''),
  ('industry_index', 'tech_hardware',      2023, 1.10, '半导体国产化'),
  ('industry_index', 'tech_hardware',      2024, 1.15, ''),
  ('industry_index', 'tech_hardware',      2025, 1.20, ''),
  ('industry_index', 'tech_hardware',      2026, 1.20, '')
ON CONFLICT DO NOTHING;

-- ============ AI 5 年替代风险评分(0-1)============
INSERT INTO environment_factors (factor_type, position_category, value, notes) VALUES
  ('ai_risk', 'content_operation',   0.70, '内容生成被 AI 替代风险高'),
  ('ai_risk', 'data_analyst',        0.60, '基础数据分析被替代'),
  ('ai_risk', 'customer_service',    0.85, '客服首批被 AI 替代'),
  ('ai_risk', 'translation',         0.80, '翻译被替代'),
  ('ai_risk', 'engineer_backend',    0.30, ''),
  ('ai_risk', 'engineer_frontend',   0.40, ''),
  ('ai_risk', 'engineer_algorithm',  0.20, ''),
  ('ai_risk', 'engineer_data',       0.35, ''),
  ('ai_risk', 'product_manager',     0.40, ''),
  ('ai_risk', 'product_designer',    0.45, ''),
  ('ai_risk', 'ui_designer',         0.55, ''),
  ('ai_risk', 'marketing',           0.50, ''),
  ('ai_risk', 'sales_b2b',           0.25, ''),
  ('ai_risk', 'sales_b2c',           0.40, ''),
  ('ai_risk', 'hr',                  0.45, ''),
  ('ai_risk', 'finance_analyst',     0.55, ''),
  ('ai_risk', 'investment_analyst',  0.40, ''),
  ('ai_risk', 'consultant',          0.35, ''),
  ('ai_risk', 'teacher_k12',         0.25, ''),
  ('ai_risk', 'civil_servant',       0.10, '')
ON CONFLICT DO NOTHING;

-- ============ 政策事件 ============
INSERT INTO environment_factors (factor_type, industry, year, value, metadata, notes) VALUES
  ('policy_event', 'education_training', 2021, 0.30,
    '{"event_name":"双减政策","impact_description":"教培行业大规模裁员"}'::jsonb, ''),
  ('policy_event', 'real_estate', 2022, 0.50,
    '{"event_name":"三道红线 + 爆雷潮","impact_description":"地产销售/财务大幅缩编"}'::jsonb, ''),
  ('policy_event', 'internet', 2023, 0.70,
    '{"event_name":"互联网大裁员","impact_description":"主要互联网公司 10-30% 缩编"}'::jsonb, ''),
  ('policy_event', 'real_estate', 2024, 0.85,
    '{"event_name":"保交楼政策","impact_description":"部分恢复但人才需求未恢复"}'::jsonb, '')
ON CONFLICT DO NOTHING;
