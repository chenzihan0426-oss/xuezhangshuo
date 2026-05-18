# 学长说 V3

> 用 1000+ 名相似背景师兄师姐 5 年前的真实选择,反推这个 offer 5 年后会变成什么样。
> 自带「环境校正层」,把上一代人的红利从分数里扣掉。

## 技术栈

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + pgvector)
- 通义千问 (仅做 embedding,做匹配)
- ECharts 可视化
- Vercel 部署

## 产品范围(简化后)

- **M1 首页** / **M2 录入** / **M5 结果(核心)** / **M7 个人中心** / **M8 支付** / **M11 分享**
- ❌ 不做 AI 对话 / 师兄人格 / Coze 集成 —— 产品聚焦"看真实数据"

## 本地启动

```bash
# 1. 装依赖
npm install

# 2. 拷贝环境变量,填入 Supabase / 通义 密钥
cp .env.example .env

# 3. 数据库初始化(在 Supabase SQL Editor)
# - 跑 supabase/migrations/0001_init.sql
# - 跑 supabase/seed.sql(可选,字典最小集)

# 4. 生成 mock 数据
cd scripts
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python seed_environment_factors.py
python generate_mock_data.py --count 1000
python build_embeddings.py

# 5. 启动 Next.js
cd ..
npm run dev
```

打开 http://localhost:3000 。

## 项目结构

```
app/
  ├─ page.tsx              M1 首页
  ├─ input/                M2 录入
  ├─ result/[matchId]      M5 结果(含 ⭐ correction-panel + insights + filters + timeline)
  ├─ profile/              M7 个人中心
  ├─ checkout/             M8 支付
  ├─ share/[id]            M11 分享
  └─ api/                  12 个 API Route
lib/
  ├─ match-engine.ts       双层匹配
  ├─ correction-engine.ts  环境校正 ⭐
  ├─ insights-engine.ts    规则引擎,生成「你需要警惕的事」
  ├─ tongyi.ts             通义封装(仅 embedding)
  └─ supabase*.ts          Supabase 客户端
components/                UI(shadcn)+ 共享组件
supabase/                  Schema 与种子数据
scripts/                   Python 离线数据脚本
e2e/                       Playwright 主流程测试
lib/__tests__/             Vitest 单测(算法 ≥ 80% 覆盖)
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地起 Next.js |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | 单测 |
| `npm run test:e2e` | Playwright |
| `npm run lint` / `format` | 代码规范 |

## 部署

- 推到 GitHub → Vercel 自动 build
- Vercel 项目里把 `.env` 里的所有变量配上即可

## 关键决策

- **mock 数据明示**:首页 footer + 分享卡片明确标注 V1 为模拟数据
- **k-匿名性 ≥ 1000**:`senior_paths.k_anonymity < 1000` 的行不允许查询展示
- **RLS 严格**:用户业务表(matches/user_offers/orders)只允许本人读写
- **环境校正**:行业景气 × AI 风险 × 政策事件,三层因子,有自然语言解释
- **规则引擎自动总结**:基于真实数据,告诉用户「你需要警惕的 3 件事」,不依赖 LLM

## 路线图

- V1 演示版(本仓库)→ 6/14 大赛截止
- V1.5 复赛打磨:接入真实支付、数据后台
- V2 决赛后:微信小程序 + 高校 toB 后台 + 智联真实数据
