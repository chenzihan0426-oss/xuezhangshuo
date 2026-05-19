/**
 * POST /api/match
 * 202 Accepted:立刻返回 match_id,异步算
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { runMatchInBackground } from '@/lib/match-runner';
import type { UserBackground, UserOffer } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const InternshipSchema = z.object({
  company_id: z.number(),
  position_category: z.string(),
  duration_months: z.number(),
});

const BackgroundSchema = z.object({
  /** 字典内学校 id;手填学校时为 0 */
  school_id: z.number().default(0),
  /** 学校名(无论手填还是选中都要有)*/
  school_name: z.string().min(1, '请填学校名'),
  /** 学校层级 1-5,必填(决定同/高/低背景划分)*/
  school_tier: z.number().int().min(1).max(5),
  major_id: z.number().default(0),
  major_category: z.string().min(1, '请选专业大类'),
  major_name: z.string().optional(),
  education_level: z.enum(['本科', '硕士', '博士']),
  graduation_year: z.number(),
  gender: z.string().optional(),
  gpa_band: z.enum(['<3.0', '3.0-3.5', '3.5+', 'unknown']),
  internships: z.array(InternshipSchema).optional(),
});

const OfferSchema = z.object({
  /** 字典内公司 id;手填公司时为 0 */
  company_id: z.number().default(0),
  /** 公司名,必填 */
  company_name: z.string().min(1, '请填公司名'),
  /** 公司类型 1-7,用于匹配(字典外公司用户必须自填)*/
  company_tier: z.number().int().min(1).max(7).optional(),
  position_category: z.string().min(1, '请选岗位大类'),
  position_name: z.string().optional(),
  level: z.enum(['intern', 'graduate', 'junior', 'mid', 'senior', 'lead']),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  location: z.string().optional(),
});

const Body = z.object({
  background: BackgroundSchema,
  offers: z.array(OfferSchema).min(1).max(5),
});

export async function POST(req: NextRequest) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', detail: parsed.error.flatten() }, { status: 400 });
  }
  const sb = createSupabaseServerClient();
  const svc = createSupabaseServiceClient();

  // 写一次 background 到 users(覆盖式)
  await sb.from('users').update({
    school_id: parsed.data.background.school_id,
    school_tier: parsed.data.background.school_tier,
    major_id: parsed.data.background.major_id,
    major_category: parsed.data.background.major_category,
    education_level: parsed.data.background.education_level,
    graduation_year: parsed.data.background.graduation_year,
    gpa_band: parsed.data.background.gpa_band,
  }).eq('id', user.id);

  // 落 offers,得到 db id(过滤掉 schema-only 字段)
  const offerRows = await Promise.all(
    parsed.data.offers.map(async (o) => {
      const { company_tier, ...persistable } = o;
      const { data, error } = await sb
        .from('user_offers')
        .insert({ ...persistable, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return { ...o, id: data.id as string };
    }),
  );

  // 1) 创建 N 个 matches 占位,拿到 id 先返回给前端,前端立刻能跳到 result/[id](页面会显示骨架屏)
  const matchRows: { id: string; offer: typeof offerRows[number] }[] = [];
  for (const offer of offerRows) {
    const { data, error } = await svc
      .from('matches')
      .insert({
        user_id: user.id,
        user_offer_id: offer.id,
        status: 'computing',
        matched_path_ids: [],
      })
      .select()
      .single();
    if (error) throw error;
    matchRows.push({ id: data.id as string, offer });
  }

  // 2) 同步并行跑匹配。Vercel Serverless 在 response 返回后会冻结函数,fire-and-forget
  //    的 Promise 跑不完 —— 必须 await。5 个 offer 并行,实测 ~5-10s,maxDuration 60s 够用。
  //    失败的单条 match 不影响其他;runMatchInBackground 内部会把 status 写成 failed。
  await Promise.allSettled(
    matchRows.map((m) =>
      runMatchInBackground(m.id, {
        background: parsed.data.background as UserBackground,
        offer: m.offer as UserOffer & { id: string },
        user_offer_db_id: m.offer.id,
      }),
    ),
  );

  return NextResponse.json(
    {
      match_ids: matchRows.map((m) => m.id),
      status: 'completed',
    },
    { status: 200 },
  );
}
