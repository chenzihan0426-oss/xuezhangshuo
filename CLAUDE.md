# CLAUDE.md — 给未来 Claude 的项目约定

本文件供任何在这个仓库工作的 Claude 会话快速进入状态。**先读一遍再动手**。

---

## 这是什么

「学长说」V3 大赛项目(2026/05/18 启动,**6/14 17:00 提交截止**)。
用 1000+ 名相似背景师兄师姐 5 年前的真实选择,反推这个 offer 5 年后会变成什么样。
核心差异化:**环境校正层**(行业景气 × AI 风险 × 政策事件),把上一代人的红利从分数里扣掉。

---

## 已做出的产品决策(不要主动改)

### ❌ 已砍掉,不要再加回来

- **AI 师兄对话功能(M6)** —— 用户(charlesarias208@gmail.com)在 2026-05-18 明确决定砍掉
- **扣子(Coze)集成** —— 不需要 chat 自然不需要 coze
- **10 个师兄人格** —— "假人"风险,被砍掉
- **通义千问的 chat 能力** —— 只保留 embedding,不调 LLM 做对话
- **conversations 数据表** —— 已从 schema 删除

### ✅ 产品聚焦在这些

- M1 首页 / M2 录入 / **M5 结果(核心)** / M7 个人中心 / M8 支付(占位)/ M11 分享
- M5 现在包含:Filters Bar + Insights Panel + Correction Panel + Timeline + 三组对比 + 薪资分布 + 桑基图 + 单条路径列表(可点开看 6 年时间线)
- 任何"加个 chat"的建议先拒绝;先问"这是数据驱动的,还是 AI 包装?"

---

## 技术栈

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + pgvector)
- 通义千问 text-embedding-v2(只用 embedding,**不调 chat 模型**)
- ECharts 5(可视化)
- Vitest(单测,目标 ≥80% 覆盖)+ Playwright(E2E)
- Vercel(部署)+ Vercel Analytics + Speed Insights + Sentry(可选)
- Python 3.11(离线 mock 数据脚本)

---

## 文件结构速查

| 你要做什么 | 去哪里 |
|---|---|
| 改首页 | `app/page.tsx`(服务端) |
| 改录入流程 | `app/input/*` |
| 改结果页 | `app/result/[matchId]/*` |
| 改匹配算法 | `lib/match-engine.ts`(server)+ `lib/match-helpers.ts`(纯函数) |
| 改环境校正 | `lib/correction-engine.ts` + `lib/constants.ts`(因子表) |
| 改自动总结 | `lib/insights-engine.ts`(规则,无 LLM) |
| 改筛选 | `lib/path-filters.ts` + `app/result/[matchId]/filters-bar.tsx` |
| 改数据库 schema | `supabase/migrations/0001_init.sql` |
| 改 mock 数据生成 | `scripts/generate_mock_data.py`(8 种故事原型) |
| 加 API Route | `app/api/.../route.ts`(认证用 `withAuth` HOF) |

---

## 关键约束

1. **k-匿名性 ≥ 1000**:`senior_paths.k_anonymity < 1000` 的行不允许查询展示(RLS 强制)
2. **RLS 严格**:用户业务表(matches/user_offers/orders)只允许本人读写
3. **环境校正必须放在 M5 顶部** —— 这是评委最关心的差异化,不能埋深
4. **insights 必须是规则计算**,不用 LLM 生成 —— 保证可解释、可复现、可验证
5. **mock 数据必须明示** —— 首页 footer + 分享卡片有"V1 演示数据"声明,不能删

---

## 常用命令

```bash
npm run dev            # 起本地
npm run typecheck      # 必须先过这关再 build
npm test               # Vitest 单测(目前 52+)
npm run test:e2e       # Playwright
npm run build          # 生产构建

# Python 离线
cd scripts && source .venv/bin/activate
python seed_dictionaries.py
python seed_environment_factors.py
python generate_mock_data.py --count 1000
python build_embeddings.py
```

---

## 当前未做的(给你的待办)

1. 真实 Supabase 项目接入(需要用户提供 URL/keys)
2. 真实通义 API key 验证 embedding 走得通
3. demo 视频录制 + 大赛提交材料
4. 智联数据合作(用户在谈)
5. 微信/支付宝真实接入(V1.5)

---

## 写代码时的偏好

- 用户喜欢**直接、不绕弯**的回答 —— 先讲利弊,再做推荐
- 用户决策果断,不要给"既要又要"的中庸方案
- 当用户问"为什么要 X" → 直接答商务/营销/技术哪个原因,不要混
- 大胆给"**不做**"的建议,他能听进去
- 代码默认不写注释,只写"为什么"的注释,不写"是什么"
- 不写多段 docstring,一行注释为限

---

## 重要文件指针

- 开发文档源:`/Users/jojo/Desktop/学长说V3-开发文档.md`
- 任何不一致以本仓库代码为准(开发文档是设计阶段产物,可能与最终实现有出入)
