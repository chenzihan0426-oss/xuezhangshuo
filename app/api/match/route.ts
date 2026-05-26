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
  /** 行业(字典内自动带,字典外用户必填)*/
  first_industry: z.string().optional(),
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

  // 落 offers,得到 db id(过滤掉 schema-only 字段:company_tier / first_industry
  // 都是匹配用的临时字段,user_offers 表 schema 不持久化)
  //
  // 兜底校验:用户前端可能有草稿污染 —— company_id 指向 A 公司,但 company_name 是 B。
  // 如果 user 输入的 name 跟 company_id 字典里的 name 不一致(且不为空),就强制走字典外路径,
  // 防止 fetchCandidates L1 错误命中(典型:输入「星巴克」但 company_id 还是阿里的)
  const allCompanyIds = parsed.data.offers
    .map((o) => o.company_id)
    .filter((id): id is number => !!id && id > 0);
  const companyDict: Record<number, { name: string; tier: number | null; industry: string | null }> = {};
  if (allCompanyIds.length) {
    const { data: companies } = await svc
      .from('companies')
      .select('id, name, tier, industry')
      .in('id', allCompanyIds);
    for (const c of companies ?? []) {
      companyDict[(c as any).id] = {
        name: (c as any).name,
        tier: (c as any).tier ?? null,
        industry: (c as any).industry ?? null,
      };
    }
  }
  const normalizedOffers = parsed.data.offers.map((o) => {
    if (o.company_id && o.company_id > 0) {
      const dict = companyDict[o.company_id];
      const dictName = dict?.name?.trim() ?? '';
      const userName = o.company_name?.trim() ?? '';
      // 如果字典 name 跟用户输入对不上,降级为字典外(清空 id 和 industry,
      // 因为 industry 极有可能是从错绑定的公司自动填的)
      if (dictName && userName && dictName !== userName) {
        console.warn(`[match POST] company_id ${o.company_id}(${dictName}) ≠ name "${userName}",降级为字典外`);
        return { ...o, company_id: 0, first_industry: undefined };
      }
      // 一致:自动补齐 tier / industry(避免前端漏带)
      return {
        ...o,
        company_tier: o.company_tier ?? (dict?.tier ?? undefined),
        first_industry: o.first_industry ?? (dict?.industry ?? undefined),
      };
    }
    return o;
  });

  const offerRows = await Promise.all(
    normalizedOffers.map(async (o) => {
      const { company_tier: _ct, first_industry: _fi, ...persistable } = o;
      void _ct;
      void _fi;
      const { data, error } = await sb
        .from('user_offers')
        .insert({ ...persistable, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      // 把 company_tier / first_industry 保留在返回对象里,match-engine 还要用
      return { ...o, id: data.id as string };
    }),
  );

  // 1) 创建 N 个 matches 占位,拿到 id 先返回给前端,前端立刻能跳到 result/[id](页面会显示骨架屏)
  // batch_id:同一次提交的 N 个 matches 共享一个 UUID,batch API 用它精确归组,
  // 解决"跨提交被 created_at 窗口误圈"的问题。
  const batchId = crypto.randomUUID();
  const matchRows: { id: string; offer: typeof offerRows[number] }[] = [];
  for (const offer of offerRows) {
    const { data, error } = await svc
      .from('matches')
      .insert({
        user_id: user.id,
        user_offer_id: offer.id,
        batch_id: batchId,
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
  const tBatch = Date.now();
  console.log(`[POST /api/match] awaiting ${matchRows.length} matches: ${matchRows.map((m) => m.id).join(',')}`);
  const settled = await Promise.allSettled(
    matchRows.map((m) =>
      runMatchInBackground(m.id, {
        background: parsed.data.background as UserBackground,
        offer: m.offer as UserOffer & { id: string },
        user_offer_db_id: m.offer.id,
      }),
    ),
  );
  const rejected = settled.filter((s) => s.status === 'rejected').length;
  console.log(`[POST /api/match] all ${matchRows.length} matches settled in ${Date.now() - tBatch}ms (rejected=${rejected})`);

  return NextResponse.json(
    {
      match_ids: matchRows.map((m) => m.id),
      status: 'completed',
    },
    { status: 200 },
  );
}
