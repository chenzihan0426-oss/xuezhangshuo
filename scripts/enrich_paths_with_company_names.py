"""
enrich_paths_with_company_names.py

非破坏性补全:
  - 读取 senior_paths 全表
  - 给每条 path_history 的每个 year 节点加上 `company_name` + `position_name`
  - 给 senior_paths 自身加 first_company_id(从同 tier 同行业的公司里抽一个代表)
  - 更新回 DB

挑公司用确定性 hash(path_id + year + tier 组合),保证多次跑结果稳定,
也保证同一师兄在同一 tier 期间公司名稳定(直到 tier 变化才换公司)。
"""
import hashlib
import time
from typing import Dict, List

from tqdm import tqdm

from _common import get_supabase


def with_retry(fn, *args, max_retries: int = 5, **kwargs):
    """简单退避重试,扛 Supabase 偶发断连"""
    delay = 1.0
    for attempt in range(max_retries):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            print(f"  retry {attempt + 1}/{max_retries} after {delay:.1f}s: {e}")
            time.sleep(delay)
            delay *= 2
    return None


def stable_pick(seed_str: str, candidates: list):
    """根据 seed 字符串确定性挑选一个候选"""
    h = int(hashlib.sha256(seed_str.encode("utf-8")).hexdigest()[:8], 16)
    return candidates[h % len(candidates)] if candidates else None


def main():
    sb = get_supabase()

    # 1. 加载字典:tier+industry → 公司列表;category → 中文名
    companies = sb.table("companies").select("id, name, tier, industry").execute().data
    positions = sb.table("positions").select("category, name").execute().data
    pos_name = {p["category"]: p["name"] for p in positions}

    # 按 (tier, industry) 分组;同 industry 缺时回退到只按 tier
    by_tier_industry: Dict[tuple, List[dict]] = {}
    by_tier: Dict[int, List[dict]] = {}
    for c in companies:
        by_tier_industry.setdefault((c["tier"], c["industry"]), []).append(c)
        by_tier.setdefault(c["tier"], []).append(c)

    def pick_company(seed: str, tier: int, industry: str) -> dict | None:
        key = (tier, industry)
        cands = by_tier_industry.get(key) or by_tier.get(tier) or []
        return stable_pick(seed, cands)

    # 2. 拿所有 paths(分页,避免一次拉太多)
    page_size = 500
    offset = 0
    total_updated = 0
    while True:
        rows = with_retry(
            lambda: sb.table("senior_paths")
            .select("id, first_company_tier, first_industry, path_history")
            .range(offset, offset + page_size - 1)
            .execute()
            .data
        )
        if not rows:
            break

        for r in tqdm(rows, desc=f"batch offset={offset}"):
            pid = r["id"]
            ph: List[dict] = r.get("path_history") or []
            if not ph:
                continue

            current_company = None
            current_tier_industry = None
            for entry in ph:
                tier = entry.get("company_tier")
                industry = entry.get("industry")
                ti_key = (tier, industry)
                if ti_key != current_tier_industry or current_company is None:
                    seed = f"{pid}|{tier}|{industry}|{entry.get('year')}"
                    current_company = pick_company(seed, tier, industry)
                    current_tier_industry = ti_key
                if current_company:
                    entry["company_name"] = current_company["name"]
                entry["position_name"] = pos_name.get(entry.get("position"), entry.get("position"))

            first_company = pick_company(
                f"{pid}|{r['first_company_tier']}|{r['first_industry']}|first",
                r["first_company_tier"],
                r["first_industry"],
            )
            update_payload = {"path_history": ph}
            if first_company:
                update_payload["first_company_id"] = first_company["id"]
            with_retry(
                lambda: sb.table("senior_paths").update(update_payload).eq("id", pid).execute()
            )
            total_updated += 1

        offset += page_size

    print(f"\n✓ enriched {total_updated} rows with company_name + position_name")


if __name__ == "__main__":
    main()
