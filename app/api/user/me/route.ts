import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const PatchSchema = z
  .object({
    school_id: z.number().int().nullable(),
    school_tier: z.number().int().min(1).max(7),
    major_id: z.number().int().nullable(),
    major_category: z.string().max(50),
    education_level: z.string().max(20),
    graduation_year: z.number().int().min(1990).max(2040),
    gender: z.string().max(10).nullable(),
    gpa_band: z.string().max(10).nullable(),
  })
  .partial();

export async function GET() {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const sb = createSupabaseServerClient();
  const { data } = await sb.from('users').select('*').eq('id', user.id).maybeSingle();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from('users')
    .update(parsed.data)
    .eq('id', user.id)
    .select()
    .maybeSingle();
  if (error) {
    console.error('[user/me]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  return NextResponse.json(data);
}
