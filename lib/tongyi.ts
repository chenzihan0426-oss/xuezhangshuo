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

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

function hasRealDashscopeKey(): boolean {
  const k = (process.env.DASHSCOPE_API_KEY ?? '').trim();
  if (!k) return false;
  return !(k === 'dummy' || k === 'sk-xxx' || k === 'xxx' || k.startsWith('dummy'));
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
  if (!hasRealDashscopeKey()) {
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

/** 批量 embed(注意通义单次最多 25 条) */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  if (!hasRealDashscopeKey()) {
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
