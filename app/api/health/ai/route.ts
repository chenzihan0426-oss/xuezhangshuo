/**
 * GET /api/health/ai
 * 诊断 AI 联网检索的环境变量是否在当前(Vercel)运行时被正确注入。
 * 不暴露明文密钥,只返回足够定位问题的信息。
 *
 * 用法:部署后浏览器直接打开 https://<你的域名>/api/health/ai
 *   key_status='looks_real' → key 已注入,AI 功能应可用
 *   key_status='empty'      → Vercel 没注入(没配 / 没 Redeploy / 作用域选错)
 *   key_status='dummy'      → 填成了占位值
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const raw = process.env.DASHSCOPE_API_KEY ?? '';
  const k = raw.trim();
  let key_status: 'empty' | 'dummy' | 'looks_real';
  if (!k) key_status = 'empty';
  else if (k === 'dummy' || k === 'sk-xxx' || k === 'xxx' || k.startsWith('dummy')) key_status = 'dummy';
  else key_status = 'looks_real';

  return NextResponse.json({
    key_status,
    key_length: k.length,
    // 是否有首尾空格(粘贴时常见的坑)
    had_whitespace: raw !== k,
    brief_model: process.env.TONGYI_BRIEF_MODEL ?? '(default: qwen-plus)',
    vercel_env: process.env.VERCEL_ENV ?? '(local)',
    node_env: process.env.NODE_ENV ?? '',
  });
}
