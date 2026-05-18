"""一键 health check:看每张表数据量、抽样一条 senior_path 看完整性"""
from _common import get_supabase

sb = get_supabase()

def count(table):
    res = sb.table(table).select("id", count="exact").limit(1).execute()
    return res.count

tables = ["schools", "majors", "companies", "positions",
          "environment_factors", "senior_paths"]

print("\n=== 表行数 ===")
for t in tables:
    print(f"  {t:25s} {count(t)} 行")

print("\n=== 抽样一条 senior_path ===")
sample = sb.table("senior_paths").select(
    "id, school_tier, major_category, start_year, first_company_tier, "
    "first_industry, first_position_category, first_level, "
    "five_year_company_tier, five_year_salary, job_changes, "
    "industry_changes, source_metadata"
).limit(1).execute().data[0]
for k, v in sample.items():
    print(f"  {k:30s} {v}")

print("\n=== 向量字段(只看一条是否为非空)===")
vec = sb.table("senior_paths").select("background_vec").not_.is_("background_vec", "null").limit(1).execute().data
print(f"  has_embedding: {bool(vec)} (拿到 {len(vec[0]['background_vec']) if vec else 0} 维)")

print("\n=== 8 种故事原型分布 ===")
data = sb.table("senior_paths").select("source_metadata").limit(2000).execute().data
arch = {}
for d in data:
    a = (d.get("source_metadata") or {}).get("archetype", "?")
    arch[a] = arch.get(a, 0) + 1
for k, v in sorted(arch.items(), key=lambda x: -x[1]):
    print(f"  {k:25s} {v}")
