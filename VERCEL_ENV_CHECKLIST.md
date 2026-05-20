# Vercel 环境变量对照清单

在 Vercel Dashboard → 项目 `xuezhangshuo` → **Settings → Environment Variables** 添加。
环境选 **Production**(顺便也勾 Preview / Development 更省事)。
**本文件不含明文密钥**,真实值见本地 `.env`(已 gitignore,不会进库)。

---

## 必填 —— 缺了线上跑不起来

| 变量名 | 值来源 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 本地 `.env` 第 2 行 | Supabase 项目 URL(`https://soxqnxzisfxajmsqukqn.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本地 `.env` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | 本地 `.env` | Supabase → Settings → API → service_role(**保密**) |

> 这三个之前能跑,说明 Vercel 上大概率已经配过 —— 进去确认一下还在即可。

---

## AI 联网功能必填 —— 缺了 AI 行业动态/薪资会显示"演示环境未接入"

| 变量名 | 值 | 说明 |
|---|---|---|
| `DASHSCOPE_API_KEY` | 阿里云 DashScope 控制台的 key | **建议先轮换一个新 key 再填**(旧的已在对话里暴露) |
| `TONGYI_BRIEF_MODEL` | `qwen-plus` | AI 联网检索用的模型 |

---

## 可选 / 已有默认值

| 变量名 | 值 | 说明 |
|---|---|---|
| `TONGYI_EMBED_MODEL` | `text-embedding-v2` | 不填用代码默认,影响不大 |
| `TONGYI_REAL_EMBED` | 不填 | 保持不填(默认走 hash,与现有向量数据一致;填 1 会让匹配错乱,除非重跑 build_embeddings) |
| `NEXT_PUBLIC_APP_URL` | `https://xuezhangshuo.vercel.app` | 生产域名(本地是 localhost:3000) |
| `NEXT_PUBLIC_APP_NAME` | `学长说` | — |

---

## 配完之后

环境变量是**新增的**,当前这次部署不会自带 —— 必须二选一让它生效:
1. Vercel Dashboard → Deployments → 最近一次 → 右上角 `⋯` → **Redeploy**
2. 或下次 git push 时会自动带上

## 验证

部署完成后打开 `https://xuezhangshuo.vercel.app`,反推一个公司(如腾讯/星巴克),进结果页看「⭐ 环境校正」卡片:
- AI 区块显示真实行业动态 + 市场参考薪资(带来源链接)= AI key 配置成功
- 显示"演示环境未接入联网检索" = `DASHSCOPE_API_KEY` 没配或无效
