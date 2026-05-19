// match 任务执行器。必须在 POST /api/match 中 await(Vercel Serverless 在 response 返回后会冻结函数,
// fire-and-forget 的 Promise 不会跑完)。前端轮询逻辑保留作为兜底。
import { matchOffer } from './match-engine';
import { createSupabaseServiceClient } from './supabase-server';
import type { UserBackground, UserOffer } from './types';

export async function runMatchInBackground(matchId: string, payload: {
  background: UserBackground;
  offer: UserOffer & { id: string };
  user_offer_db_id: string;
}) {
  const sb = createSupabaseServiceClient();
  try {
    const result = await matchOffer({ background: payload.background, offer: payload.offer });
    await sb
      .from('matches')
      .update({
        status: 'completed',
        same_group_ids: result.groups.same.paths.map((p) => p.id),
        higher_group_ids: result.groups.higher.paths.map((p) => p.id),
        lower_group_ids: result.groups.lower.paths.map((p) => p.id),
        same_count: result.groups.same.count,
        higher_count: result.groups.higher.count,
        lower_count: result.groups.lower.count,
        correction_data: result.correction,
        matched_path_ids: [
          ...result.groups.same.paths.map((p) => p.id),
          ...result.groups.higher.paths.map((p) => p.id),
          ...result.groups.lower.paths.map((p) => p.id),
        ],
      })
      .eq('id', matchId);
  } catch (e) {
    await sb
      .from('matches')
      .update({ status: 'failed', error_message: e instanceof Error ? e.message : 'unknown' })
      .eq('id', matchId);
  }
}
