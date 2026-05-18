# Supabase 配置

## 本地启动顺序

1. 创建 Supabase 项目 → 拿到 `URL` / `anon key` / `service_role key`,填入根目录 `.env`
2. 在 Supabase SQL Editor 执行 `migrations/0001_init.sql`
3. 在 Supabase SQL Editor 执行 `seed.sql`(可选,生产用 `scripts/seed_dictionaries.py` 全量)
4. 跑 `python scripts/generate_mock_data.py` 生成 1000 条 mock 路径
5. 跑 `python scripts/build_embeddings.py` 给所有路径生成向量

## 注意

- `senior_paths` 启用了 RLS,只允许通过 `service_role` key 写入
- 字典表 / 环境因子表对匿名用户可读
- 用户业务表(matches/user_offers/orders)只允许本人访问
