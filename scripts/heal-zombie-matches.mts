// 救活 production 里 status=computing 的 zombie match。
// 直接对每条调 runMatchInBackground,写回 status=completed。
// 用法:npx tsx scripts/heal-zombie-matches.mts
import 'dotenv/config';
import { runMatchInBackground } from '../lib/match-runner';
import { createSupabaseServiceClient } from '../lib/supabase-server';
import type { UserBackground, UserOffer } from '../lib/types';

const svc = createSupabaseServiceClient();

async function main() {
  const { data: zombies, error } = await svc
    .from('matches')
    .select('id, user_id, user_offer_id, created_at, user_offers(*)')
    .eq('status', 'computing')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!zombies?.length) {
    console.log('没有 zombie matches。');
    return;
  }
  console.log(`找到 ${zombies.length} 条 zombie:`);
  for (const z of zombies) {
    console.log(`  ${z.id} (${(z as any).user_offers?.company_name}/${(z as any).user_offers?.position_category}) created ${z.created_at}`);
  }

  for (const z of zombies) {
    const userOffer = (z as any).user_offers as any;
    if (!userOffer) {
      console.log(`[skip ${z.id}] no user_offers`);
      continue;
    }
    // 拉对应 user 的 background
    const { data: u } = await svc
      .from('users')
      .select('school_id, school_tier, major_id, major_category, education_level, graduation_year, gpa_band')
      .eq('id', z.user_id)
      .maybeSingle();
    if (!u) {
      console.log(`[skip ${z.id}] no user background`);
      continue;
    }
    const background: UserBackground = { ...(u as any), internships: [] };
    const offer: UserOffer & { id: string } = {
      id: userOffer.id,
      company_id: userOffer.company_id,
      company_name: userOffer.company_name,
      company_tier: userOffer.company_tier,
      position_category: userOffer.position_category,
      level: userOffer.level,
      salary_min: userOffer.salary_min,
      salary_max: userOffer.salary_max,
      location: userOffer.location,
    } as any;
    console.log(`\n=== 救活 ${z.id} ===`);
    const t0 = Date.now();
    await runMatchInBackground(z.id, { background, offer, user_offer_db_id: userOffer.id });
    console.log(`  耗时 ${Date.now() - t0}ms`);
    // 查最终 status
    const { data: after } = await svc
      .from('matches')
      .select('status, same_count, lower_count, higher_count, error_message')
      .eq('id', z.id)
      .single();
    console.log(`  最终:`, after);
  }
  console.log('\n全部处理完毕。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
