// 端到端验证 runMatchInBackground:
// 1) 创建一条 matches 占位(probe-* 前缀,便于清理)
// 2) 调 runMatchInBackground
// 3) 查 status 是否变 completed,打印耗时
import 'dotenv/config';
import { runMatchInBackground } from '../lib/match-runner';
import { createSupabaseServiceClient } from '../lib/supabase-server';
import type { UserBackground, UserOffer } from '../lib/types';

const svc = createSupabaseServiceClient();

async function main() {
  // 找一个有效的 user_id(随便选一个 user_offers 里的)
  const { data: anyOffer } = await svc
    .from('user_offers')
    .select('user_id')
    .limit(1)
    .maybeSingle();
  if (!anyOffer) {
    console.error('需要至少一个 user_offers 行才能跑');
    process.exit(1);
  }
  const userId = (anyOffer as any).user_id as string;

  // probe 场景:从命令行参数选 'starbucks'(字典外)或默认 '腾讯'(字典内)
  const isStarbucks = process.argv.includes('--starbucks');
  const offerProfile = isStarbucks
    ? {
        company_id: 0, // 字典外
        company_name: '星巴克',
        company_tier: 4,
        first_industry: 'other', // 用户选了「其他」
        position_category: 'product_manager',
        level: 'graduate' as const,
      }
    : {
        company_id: 3,
        company_name: '腾讯',
        company_tier: 1,
        first_industry: 'internet',
        position_category: 'product_manager',
        level: 'graduate' as const,
      };

  const { data: offerRow, error: offerErr } = await svc
    .from('user_offers')
    .insert({
      user_id: userId,
      company_id: offerProfile.company_id,
      company_name: offerProfile.company_name,
      position_category: offerProfile.position_category,
      level: offerProfile.level,
    })
    .select()
    .single();
  if (offerErr) {
    console.error('插 user_offers 失败:', offerErr);
    process.exit(1);
  }
  const offerId = (offerRow as any).id as string;
  console.log(`[probe] 创建 user_offer ${offerId} (${offerProfile.company_name})`);

  // 插一条 matches(status=computing)
  const { data: matchRow, error: matchErr } = await svc
    .from('matches')
    .insert({
      user_id: userId,
      user_offer_id: offerId,
      status: 'computing',
      matched_path_ids: [],
    })
    .select()
    .single();
  if (matchErr) {
    console.error('插 matches 失败:', matchErr);
    process.exit(1);
  }
  const matchId = (matchRow as any).id as string;
  console.log(`[probe] 创建 match ${matchId}, status=computing`);

  // 模拟 background
  const background: UserBackground = {
    school_id: 1,
    school_tier: 2,
    major_id: 1,
    major_category: 'business',
    education_level: '本科',
    graduation_year: 2026,
    gpa_band: '3.5+',
    internships: [],
  };

  const offer: UserOffer & { id: string } = {
    id: offerId,
    ...offerProfile,
  } as any;

  // 跑 runMatchInBackground
  const t0 = Date.now();
  console.log('[probe] 调用 runMatchInBackground...');
  await runMatchInBackground(matchId, { background, offer, user_offer_db_id: offerId });
  const elapsed = Date.now() - t0;
  console.log(`[probe] runMatchInBackground 返回,总耗时 ${elapsed}ms`);

  // 查 matches 当前 status + correction_data
  const { data: after } = await svc
    .from('matches')
    .select('status, same_count, higher_count, lower_count, error_message, correction_data')
    .eq('id', matchId)
    .single();
  console.log('[probe] match 最终状态:', { ...(after as any), correction_data: undefined });
  console.log('[probe] correction_data:', JSON.stringify((after as any)?.correction_data, null, 2));

  // 清理(避免污染)
  await svc.from('matches').delete().eq('id', matchId);
  await svc.from('user_offers').delete().eq('id', offerId);
  console.log('[probe] 清理完成');

  // 判定
  if ((after as any)?.status === 'completed') {
    console.log('\n✅ PASS: 修复后的 runMatchInBackground 能让 status 变成 completed');
  } else {
    console.log(`\n❌ FAIL: status=${(after as any)?.status}, error=${(after as any)?.error_message}`);
  }
}

main().catch((e) => {
  console.error('[probe] uncaught:', e);
  process.exit(1);
});
