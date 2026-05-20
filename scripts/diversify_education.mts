// 给 senior_paths 补学历多样性(原本全是"本科",没区分度)。
// 按院校层级分配硕士/博士比例:名校硕博比例更高,符合现实。
// 用法:npx tsx scripts/diversify_education.mts
import 'dotenv/config';
import { createSupabaseServiceClient } from '../lib/supabase-server';

const svc = createSupabaseServiceClient();

// school_tier → { 硕士比例, 博士比例 }(其余保持本科)
const DIST: Record<number, { master: number; phd: number }> = {
  1: { master: 0.45, phd: 0.1 }, // C9
  2: { master: 0.4, phd: 0.05 }, // 985 非 C9
  3: { master: 0.28, phd: 0.02 }, // 211 非 985
  4: { master: 0.15, phd: 0 }, // 普通一本
  5: { master: 0.08, phd: 0 }, // 二本及以下
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function updateInBatches(ids: string[], educationLevel: string) {
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await svc
      .from('senior_paths')
      .update({ education_level: educationLevel })
      .in('id', batch);
    if (error) throw error;
  }
}

async function main() {
  for (const tier of [1, 2, 3, 4, 5]) {
    const { data, error } = await svc.from('senior_paths').select('id').eq('school_tier', tier);
    if (error) throw error;
    const ids = shuffle((data ?? []).map((r: any) => r.id as string));
    const n = ids.length;
    const { master, phd } = DIST[tier];
    const nMaster = Math.round(n * master);
    const nPhd = Math.round(n * phd);
    const masterIds = ids.slice(0, nMaster);
    const phdIds = ids.slice(nMaster, nMaster + nPhd);
    // 先全部置回本科(幂等:重复跑结果稳定),再覆盖硕士/博士
    await updateInBatches(ids, '本科');
    if (masterIds.length) await updateInBatches(masterIds, '硕士');
    if (phdIds.length) await updateInBatches(phdIds, '博士');
    console.log(`tier ${tier}: ${n} 条 → 本科 ${n - nMaster - nPhd} / 硕士 ${nMaster} / 博士 ${nPhd}`);
  }
  console.log('完成');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
