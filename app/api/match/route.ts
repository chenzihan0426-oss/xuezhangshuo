/**
 * POST /api/match
 * 202 Accepted:立刻返回 match_id,异步算
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
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
  school_id: z.number(),
  school_tier: z.number().int().min(1).max(5),
  major_id: z.number(),
  major_category: z.string(),
  education_level: z.enum(['本科', '硕士', '博士']),
  graduation_year: z.number(),
  gender: z.string().optional(),
  gpa_band: z.enum(['<3.0', '3.0-3.5', '3.5+', 'unknown']),
  internships: z.array(InternshipSchema).optional(),
});

const OfferSchema = z.object({
  company_id: z.number(),
  company_name: z.string().optional(),
  position_category: z.string(),
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
  const user = await requireUser();
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

  // 落 offers,得到 db id
  const offerRows = await Promise.all(
    parsed.data.offers.map(async (o) => {
      const { data, error } = await sb
        .from('user_offers')
        .insert({ ...o, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return { ...o, id: data.id as string };
    }),
  );

  // 创建 N 个 matches 记录,并行 fire 后台任务
  const matchIds: string[] = [];
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
    matchIds.push(data.id as string);
    void runMatchInBackground(data.id as string, {
      background: parsed.data.background as UserBackground,
      offer: offer as UserOffer & { id: string },
      user_offer_db_id: offer.id,
    });
  }

  return NextResponse.json(
    {
      match_ids: matchIds,
      status: 'computing',
      estimated_seconds: 5,
    },
    { status: 202 },
  );
}
