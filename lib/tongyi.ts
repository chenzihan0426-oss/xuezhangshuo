/**
 * 通义千问 SDK 封装(阿里云灵积 DashScope 兼容 OpenAI 协议)
 *
 * 文档:https://help.aliyun.com/zh/dashscope/
 *
 * 降级模式:DASHSCOPE_API_KEY 没设或为 'dummy' 时,
 * embedText 会走 `stableHashVector`,跟 Python 端 build_embeddings.py 的 fallback 输出一致,
 * 保证 demo 跑通(只是匹配相关性差,头部排序近似随机)。
 */
import { createHash } from 'node:crypto';
import { VECTOR_DIM } from './constants';
import type { AiBrief } from './types';

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

function hasRealDashscopeKey(): boolean {
  const k = (process.env.DASHSCOPE_API_KEY ?? '').trim();
  if (!k) return false;
  return !(k === 'dummy' || k === 'sk-xxx' || k === 'xxx' || k.startsWith('dummy'));
}

/**
 * embedText 是否用真通义向量。
 * 注意:DB 里 senior_paths.background_vec 当初是用 stableHashVector 生成的,
 * 若 userVec 改用真通义向量,两个向量空间不可比,相似度排序会失效。
 * 所以默认即使有真 key,embedText 仍走 hash —— 除非重新用真 key 跑过 build_embeddings
 * 并显式设 TONGYI_REAL_EMBED=1。AI 联网简报(generateCompanyBrief)不受此限制。
 */
function shouldUseRealEmbedding(): boolean {
  return hasRealDashscopeKey() && process.env.TONGYI_REAL_EMBED === '1';
}

/**
 * 确定性 hash 向量。对同一段文本,Python 和 TS 实现都返回完全一样的向量。
 * 用法:demo 期没有通义 key 时的降级 embedding。
 */
export function stableHashVector(text: string, dim = VECTOR_DIM): number[] {
  let buf = createHash('sha256').update(text).digest();
  while (buf.length < dim * 4) {
    buf = Buffer.concat([buf, createHash('sha256').update(buf).digest()]);
  }
  const floats: number[] = [];
  for (let i = 0; i < dim; i++) {
    const u = buf.readUInt32LE(i * 4);
    floats.push((u / 0xffffffff) * 2 - 1);
  }
  const norm = Math.sqrt(floats.reduce((s, v) => s + v * v, 0)) || 1;
  return floats.map((v) => v / norm);
}

interface EmbedResponse {
  output: { embeddings: Array<{ text_index: number; embedding: number[] }> };
  usage: { total_tokens: number };
  request_id: string;
}

function getKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('DASHSCOPE_API_KEY not set');
  return key;
}

/**
 * 把背景文本转为 128 维向量(裁剪 + 归一化)
 * 通义 text-embedding-v2 原始 1536 维,在向量库占空间太大,这里取前 128 维(主成分近似)。
 *
 * 降级:无 dashscope key 时返回 stableHashVector,保证 demo 不报错。
 */
export async function embedText(text: string): Promise<number[]> {
  if (!shouldUseRealEmbedding()) {
    return stableHashVector(text);
  }
  const model = process.env.TONGYI_EMBED_MODEL ?? 'text-embedding-v2';
  // 通义 API 偶发慢响应会把整个 match POST 拖到 Vercel 超时。3s 没回就降级到本地 hash。
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`${DASHSCOPE_BASE}/services/embeddings/text-embedding/text-embedding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: { texts: [text] },
        parameters: { text_type: 'document' },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[tongyi] embed http ${res.status}, falling back to stableHashVector`);
      return stableHashVector(text);
    }
    const data = (await res.json()) as EmbedResponse;
    const raw = data.output.embeddings[0]?.embedding ?? [];
    return truncateAndNormalize(raw, VECTOR_DIM);
  } catch (e) {
    console.warn(`[tongyi] embed timeout/error, falling back to stableHashVector:`, e);
    return stableHashVector(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI 联网检索:就「公司 + 行业」生成近 12 个月真实动态简报。
 *
 * 关键防幻觉机制:只信通义 search_info.search_results 里的真实 URL。
 * AI 输出的 events,凡 source_url 不在 search_results 白名单内的一律丢弃 ——
 * 即使模型编造内容/URL,也展示不出来。
 *
 * 校正分数完全不受本函数影响(纯补充解读)。
 */
interface QwenSearchResponse {
  output?: {
    choices?: Array<{ message?: { content?: string } }>;
    text?: string;
    search_info?: { search_results?: Array<{ title?: string; url?: string; site_name?: string }> };
  };
}

export async function generateCompanyBrief(input: {
  company: string;
  industry: string;
  position?: string;
}): Promise<AiBrief> {
  if (!hasRealDashscopeKey()) {
    return { found: false, summary: '', events: [], degraded: 'no_key' };
  }

  const model = process.env.TONGYI_BRIEF_MODEL ?? 'qwen-plus';
  const industryLabel = INDUSTRY_CN[input.industry] ?? input.industry;
  const positionLabel = input.position ? POSITION_CN[input.position] ?? input.position : '';
  const system =
    '你是职业环境信息核查助手。仅依据本次联网检索结果作答,严禁编造/推测/用记忆里的旧信息。\n' +
    '铁律:\n' +
    '1. 每条 event 必须对应一条真实检索来源,source_url 必须是检索结果里出现过的 URL,不得自造。\n' +
    '2. 检索为空或不相关时 found=false、events=[]、summary 写"未检索到该公司近期公开动态",不要用行业常识凑数。\n' +
    '3. 无法确认日期写 null,不编造。\n' +
    '4. career_outlook 只基于已列 events 做一句话谨慎解读,不引入新事实。\n' +
    '5. salary_range:综合检索到的薪资信息(脉脉/看准网/OfferShow/职级薪资等)与该岗位的行业普遍水平,给应届起薪和工作约 5 年后的年薪区间(单位:万元/年,数字不带单位)。优先用检索到的真实数据;若真实数据不足,可给一个保守、符合常识的行业经验区间,并在 basis 注明"综合市场公开数据估算"。区间必须符合常识、不得离谱。完全无法判断时才设为 null。\n' +
    '6. correction:基于检索到的真实信息,判断「这家公司」相比所在行业的通用水平,环境是更好还是更差,给出一个调整系数 company_adjustment(数字,0.85=明显更差如裁员/衰退/业务收缩,1.0=与行业持平或无明确信息,1.15=明显更好如逆势增长/大规模扩招/新业务爆发)。rationale 用一句话给依据(基于已检索到的事实,不编)。dimension_notes 对行业景气(industry)、AI 替代风险(ai_risk)、政策影响(policy)各给一句真实备注(没有相关信息就省略该项)。无任何可靠信息时 company_adjustment=1.0。\n' +
    '只输出 JSON,不要任何多余文字:{"found":bool,"summary":string,"events":[{"title":string,"date":string|null,"source_url":string}],"career_outlook":string,"salary_range":{"fresh_low":number,"fresh_high":number,"senior_low":number,"senior_high":number,"basis":string}|null,"correction":{"company_adjustment":number,"rationale":string,"dimension_notes":{"industry":string,"ai_risk":string,"policy":string}}|null}';
  const userMsg =
    `请检索并总结「${input.company}」(${industryLabel}行业)近 12 个月的重要动态:经营状况、裁员/扩招、融资、相关政策,以及对应届生 5 年职业发展的影响。` +
    (positionLabel
      ? `\n另外检索该公司「${positionLabel}」岗位的真实市场薪资:应届起薪、工作约 5 年后的年薪水平,给出区间(万元/年)。`
      : '');

  // 联网检索 + 生成本就慢;Vercel 服务器在海外,到阿里云(中国)还要跨境,更慢。
  // 给到 55s(brief route maxDuration=60s 兜底),尽量在函数被杀前拿到结果。
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: { messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }] },
        parameters: {
          enable_search: true,
          search_options: { enable_source: true, enable_citation: false },
          result_format: 'message',
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[tongyi] brief http ${res.status}`);
      return { found: false, summary: '', events: [], degraded: 'error' };
    }
    const data = (await res.json()) as QwenSearchResponse;
    const content = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? '';
    const searchResults = data.output?.search_info?.search_results ?? [];
    const sources = searchResults
      .filter((s) => s.url)
      .map((s) => ({ title: s.title ?? s.url ?? '', url: s.url as string, site_name: s.site_name }));

    const parsed = parseBriefJson(content);
    if (!parsed) {
      return { found: false, summary: '', events: [], degraded: 'error' };
    }

    // URL 白名单过滤:event.source_url 必须能在真实来源里找到对应
    const allow = sources.map((s) => s.url);
    const filteredEvents = (parsed.events ?? []).filter((ev) => {
      if (!ev.source_url) return false;
      return allow.some((u) => u === ev.source_url || u.includes(ev.source_url) || ev.source_url.includes(u));
    });

    // 薪资区间:做基本健全性校验(正数 + low<=high),异常则丢弃
    const sr = parsed.salary_range;
    const validSalary =
      sr &&
      [sr.fresh_low, sr.fresh_high, sr.senior_low, sr.senior_high].every(
        (n) => typeof n === 'number' && n > 0 && n < 1000,
      ) &&
      sr.fresh_low <= sr.fresh_high &&
      sr.senior_low <= sr.senior_high
        ? sr
        : null;

    // 环境精化:company_adjustment 限幅 [0.85, 1.15],非法则中性 1.0
    const corr = parsed.correction;
    let validCorrection: AiBrief['correction'] = null;
    if (corr && typeof corr.company_adjustment === 'number' && isFinite(corr.company_adjustment)) {
      validCorrection = {
        company_adjustment: Math.min(1.15, Math.max(0.85, corr.company_adjustment)),
        rationale: corr.rationale ?? '',
        dimension_notes: corr.dimension_notes ?? undefined,
      };
    }

    return {
      found: !!parsed.found && (filteredEvents.length > 0 || !!parsed.summary),
      summary: parsed.summary ?? '',
      events: filteredEvents,
      career_outlook: parsed.career_outlook,
      salary_range: validSalary,
      correction: validCorrection,
      sources,
      generated_at: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('[tongyi] brief timeout/error:', e);
    return { found: false, summary: '', events: [], degraded: 'timeout' };
  } finally {
    clearTimeout(timer);
  }
}

function parseBriefJson(content: string): {
  found?: boolean;
  summary?: string;
  events?: { title: string; date: string | null; source_url: string }[];
  career_outlook?: string;
  salary_range?: {
    fresh_low: number;
    fresh_high: number;
    senior_low: number;
    senior_high: number;
    basis: string;
  } | null;
  correction?: {
    company_adjustment: number;
    rationale: string;
    dimension_notes?: { industry?: string; ai_risk?: string; policy?: string };
  } | null;
} | null {
  if (!content) return null;
  // 去掉可能的 ```json ... ``` 包裹
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  // 截取第一个 { 到最后一个 }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const INDUSTRY_CN: Record<string, string> = {
  internet: '互联网',
  finance: '金融',
  education_training: '教培',
  real_estate: '地产',
  auto_ev: '新能源车',
  tech_hardware: '硬件',
  telecom: '通信',
  energy: '能源',
  consulting: '咨询',
  startup: '创业',
  consumer_service: '消费服务',
};

const POSITION_CN: Record<string, string> = {
  engineer_backend: '后端开发',
  engineer_frontend: '前端开发',
  engineer_algorithm: '算法',
  engineer_data: '数据工程',
  product_manager: '产品经理',
  product_designer: '产品设计',
  ui_designer: 'UI 设计',
  content_operation: '内容运营',
  user_operation: '用户运营',
  marketing: '市场营销',
  sales_b2b: 'B2B 销售',
  sales_b2c: 'B2C 销售',
  data_analyst: '数据分析',
  finance_analyst: '财务分析',
  investment_analyst: '投资分析',
  consultant: '咨询顾问',
  hr: '人力资源',
  teacher_k12: 'K12 教师',
  civil_servant: '公务员',
};

/** 批量 embed(注意通义单次最多 25 条) */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  if (!shouldUseRealEmbedding()) {
    return texts.map((t) => stableHashVector(t));
  }
  const model = process.env.TONGYI_EMBED_MODEL ?? 'text-embedding-v2';
  const result: number[][] = [];
  for (let i = 0; i < texts.length; i += 25) {
    const batch = texts.slice(i, i + 25);
    const res = await fetch(`${DASHSCOPE_BASE}/services/embeddings/text-embedding/text-embedding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: { texts: batch },
        parameters: { text_type: 'document' },
      }),
    });
    if (!res.ok) throw new Error(`tongyi embed batch failed: ${res.status}`);
    const data = (await res.json()) as EmbedResponse;
    for (const emb of data.output.embeddings) {
      result.push(truncateAndNormalize(emb.embedding, VECTOR_DIM));
    }
  }
  return result;
}

function truncateAndNormalize(vec: number[], dim: number): number[] {
  const truncated = vec.slice(0, dim);
  if (truncated.length < dim) {
    while (truncated.length < dim) truncated.push(0);
  }
  const norm = Math.sqrt(truncated.reduce((s, v) => s + v * v, 0)) || 1;
  return truncated.map((v) => v / norm);
}

/**
 * 把用户背景 / 师兄路径转成稳定的文本表征,然后送 embed。
 * 字段顺序固定,保证同样背景永远生成相同 embedding。
 */
export function backgroundToText(input: {
  school_tier: number;
  major_category: string;
  education_level?: string;
  gpa_band?: string;
  internships_count?: number;
  has_top_internship?: boolean;
}): string {
  return [
    `school_tier=${input.school_tier}`,
    `major=${input.major_category}`,
    `edu=${input.education_level ?? '本科'}`,
    `gpa=${input.gpa_band ?? 'unknown'}`,
    `internships=${input.internships_count ?? 0}`,
    `top_intern=${input.has_top_internship ? '1' : '0'}`,
  ].join('|');
}
