"""把 senior_paths 的 background_vec 全清空,用新算法重建"""
from _common import get_supabase

sb = get_supabase()
# pgvector 字段 set 为 None 即 NULL
res = sb.table("senior_paths").update({"background_vec": None}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"reset {len(res.data) if res.data else 'unknown'} rows")
