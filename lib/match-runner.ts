/**
 * 异步 match 任务执行器。
 *
 * /api/match 收到请求后:
 *   1) 在 matches 表插入一条 status=computing 的记录,立刻 return match_id
 *   2) `void runMatchInBackground(matchId)` 异步执行
 *   3) 前端轮询 GET /api/match/[id] 直到 status=completed
 *
 * Vercel serverless 下,Promise 不被 await 时仍会执行完(直到函数 maxDuration)。
 */
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
