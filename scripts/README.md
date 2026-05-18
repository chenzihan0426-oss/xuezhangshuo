# 离线脚本

## 启动顺序

```bash
cd scripts
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # 然后填上 SUPABASE / DASHSCOPE 密钥

# 1. 字典种子(可跳过,supabase/seed.sql 已有最小集)
python seed_dictionaries.py

# 2. 环境校正因子(从 lib/constants.ts 同步到 DB)
python seed_environment_factors.py

# 3. 生成 1000 条 mock 路径
python generate_mock_data.py --count 1000

# 4. 给所有路径生成 embedding 并写回 background_vec
python build_embeddings.py
```

## 设计原则

- **可重入**:每个脚本支持 `--upsert` 模式,重复跑不重复插
- **可降级**:`generate_mock_data.py` 如果没有 DASHSCOPE_API_KEY,会走纯统计抽样,不调用 LLM
- **可观测**:全部走 tqdm 进度条,出错单独写 `scripts/errors.jsonl`
