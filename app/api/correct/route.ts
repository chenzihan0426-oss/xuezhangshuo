/**
 * POST /api/correct  对单条路径调用环境校正(诊断/调试用)
 */
import { NextRequest, NextResponse } from 'next/server';
import { correctPath } from '@/lib/correction-engine';
import type { SeniorPath } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { path: SeniorPath; current_year?: number };
  if (!body?.path) return NextResponse.json({ error: 'missing path' }, { status: 400 });
  return NextResponse.json(correctPath(body.path, body.current_year));
}
