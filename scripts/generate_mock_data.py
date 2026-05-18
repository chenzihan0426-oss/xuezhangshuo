"""
generate_mock_data.py

按公开就业报告的真实分布,生成 1000 条 mock 师兄师姐 5 年路径。
v2 改进:path_history 多样化(有连跳 / 留守 / 转岗 / 转行 / 升迁慢 等故事),
让 paths-list 点开详情时,每条路径都讲得出"发生了什么"。

默认走纯统计抽样(不依赖 LLM,可离线跑)。
"""
import argparse
import random
from typing import Dict, List, Tuple

from tqdm import tqdm

from _common import get_supabase, has_dashscope, jsonl_append, ROOT

# ============ 真实分布(基于智联校园 2024 + 麦可思公开数据)============
SCHOOL_TIER_DIST: Dict[int, float] = {1: 0.05, 2: 0.10, 3: 0.15, 4: 0.30, 5: 0.40}

MAJOR_DIST: Dict[str, float] = {
    "computer_science": 0.15,
    "business": 0.20,
    "engineering": 0.18,
    "finance": 0.08,
    "humanities": 0.12,
    "design": 0.05,
    "law": 0.04,
    "medicine": 0.06,
    "education": 0.07,
    "other": 0.05,
}

FIRST_COMPANY_TIER_GIVEN_SCHOOL: Dict[int, Dict[int, float]] = {
    1: {1: 0.50, 2: 0.25, 3: 0.10, 4: 0.05, 5: 0.05, 7: 0.05},
    2: {1: 0.30, 2: 0.28, 3: 0.18, 4: 0.10, 5: 0.08, 7: 0.06},
    3: {1: 0.15, 2: 0.22, 3: 0.25, 4: 0.18, 5: 0.10, 7: 0.10},
    4: {1: 0.05, 2: 0.10, 3: 0.20, 4: 0.30, 5: 0.20, 7: 0.15},
    5: {1: 0.02, 2: 0.05, 3: 0.13, 4: 0.30, 5: 0.30, 7: 0.20},
}

INDUSTRY_GIVEN_COMPANY_TIER: Dict[int, Dict[str, float]] = {
    1: {"internet": 0.40, "tech_hardware": 0.20, "finance": 0.15, "consulting": 0.10, "auto_ev": 0.10, "other": 0.05},
    2: {"internet": 0.35, "auto_ev": 0.20, "tech_hardware": 0.15, "finance": 0.10, "education_training": 0.05, "other": 0.15},
    3: {"internet": 0.40, "finance": 0.15, "real_estate": 0.10, "education_training": 0.15, "other": 0.20},
    4: {"real_estate": 0.25, "education_training": 0.20, "internet": 0.20, "finance": 0.10, "other": 0.25},
    5: {"finance": 0.30, "telecom": 0.20, "energy": 0.20, "other": 0.30},
    7: {"internet": 0.30, "startup": 0.50, "other": 0.20},
}

POSITION_GIVEN_MAJOR: Dict[str, Dict[str, float]] = {
    "computer_science": {"engineer_backend": 0.35, "engineer_frontend": 0.15, "engineer_algorithm": 0.15, "engineer_data": 0.10, "product_manager": 0.10, "data_analyst": 0.10, "other": 0.05},
    "business": {"product_manager": 0.20, "marketing": 0.20, "sales_b2b": 0.15, "hr": 0.10, "user_operation": 0.15, "consultant": 0.05, "other": 0.15},
    "engineering": {"engineer_backend": 0.30, "engineer_data": 0.15, "engineer_algorithm": 0.10, "product_manager": 0.10, "other": 0.35},
    "finance": {"finance_analyst": 0.30, "investment_analyst": 0.20, "consultant": 0.15, "data_analyst": 0.15, "other": 0.20},
    "humanities": {"content_operation": 0.30, "marketing": 0.20, "user_operation": 0.15, "hr": 0.10, "translation": 0.10, "other": 0.15},
    "design": {"ui_designer": 0.40, "product_designer": 0.30, "other": 0.30},
    "law": {"consultant": 0.20, "civil_servant": 0.20, "hr": 0.10, "other": 0.50},
    "medicine": {"other": 1.0},
    "education": {"teacher_k12": 0.40, "user_operation": 0.20, "content_operation": 0.20, "other": 0.20},
    "other": {"sales_b2c": 0.20, "marketing": 0.15, "user_operation": 0.15, "other": 0.50},
}

# ============ 5 种故事原型(权重 = 该原型在真实样本中的占比)============
# 每种原型给出一个 (level_progression, tier_progression, industry_progression) 的模板,
# 加噪声。每年用一个 (level, company_tier, industry) 三元组表示。
STORY_ARCHETYPES = [
    # (name, weight) -> 在 build_story 里按 name 走具体逻辑
    ("steady_climber", 0.25),       # 老老实实在原公司升迁
    ("one_jump_promo", 0.20),       # 2-3 年跳一次,升职更快
    ("frequent_jumper", 0.10),      # 1-2 年跳一次,薪资涨但稳定性差
    ("forced_pivot", 0.15),         # 因外部事件被迫转行
    ("career_reboot", 0.10),        # 主动转岗(从运营转 PM、设计转 PM 等)
    ("plateaued", 0.10),            # 5 年没动也没升,在原公司"躺平"
    ("downhill", 0.05),             # 公司倒闭 / 部门裁撤,5 年后比起点更差
    ("rocket", 0.05),               # 跟对人 / 风口,5 年升到 lead
]

LEVELS_ORDERED = ["intern", "graduate", "junior", "mid", "senior", "lead"]

# 跳槽时 tier 变化方向(往上跳更常见,但创业公司去大厂概率小)
def jump_tier(current: int) -> int:
    if current <= 2:
        return random.choices([current, current, current + 1, current - 1], weights=[0.4, 0.3, 0.2, 0.1])[0]
    # tier 3-7 跳的话往上的概率更大
    return random.choices(
        [max(1, current - 2), current - 1, current, current + 1],
        weights=[0.05, 0.55, 0.30, 0.10],
    )[0]


def pick_archetype() -> str:
    names = [a[0] for a in STORY_ARCHETYPES]
    weights = [a[1] for a in STORY_ARCHETYPES]
    return random.choices(names, weights=weights, k=1)[0]


def level_up(level: str, steps: int = 1) -> str:
    idx = LEVELS_ORDERED.index(level)
    return LEVELS_ORDERED[min(len(LEVELS_ORDERED) - 1, idx + steps)]


def pick_pivot_industry(current: str, start_year: int) -> str:
    """根据政策/景气变化,选一个常见 pivot 目标"""
    pivot_rules = {
        "education_training": ["internet", "consulting", "other"] if start_year <= 2021 else ["internet"],
        "real_estate": ["auto_ev", "consulting", "energy"] if start_year <= 2022 else ["auto_ev"],
        "internet": ["auto_ev", "tech_hardware", "consulting"] if start_year >= 2022 else ["startup"],
    }
    candidates = pivot_rules.get(current, list(INDUSTRY_GIVEN_COMPANY_TIER[2].keys()))
    return random.choice(candidates)


def build_story(arch: str, start_year: int, first_company_tier: int,
                first_industry: str, first_position: str, first_level: str) -> Tuple[List[dict], int, int]:
    """
    返回 (path_history, total_job_changes, total_industry_changes)
    path_history 长度 6(year 0 = 入职年,year 5 = 5 年后)
    """
    history: List[dict] = []
    cur_level = first_level
    cur_tier = first_company_tier
    cur_industry = first_industry
    cur_position = first_position
    job_changes = 0
    industry_changes = 0
    salary_base = base_salary_for(cur_tier, cur_level, cur_industry)

    for year_offset in range(6):
        year = start_year + year_offset

        if year_offset == 0:
            # 入职年:直接用初始值
            pass
        elif arch == "steady_climber":
            # 每 2 年小幅升一级,留在原公司原行业
            if year_offset in (2, 4):
                cur_level = level_up(cur_level)
                salary_base = int(salary_base * 1.18)
        elif arch == "one_jump_promo":
            if year_offset == 3:
                cur_tier = jump_tier(cur_tier)
                cur_level = level_up(cur_level, 1)
                salary_base = int(salary_base * 1.35)
                job_changes += 1
            elif year_offset == 5:
                cur_level = level_up(cur_level)
                salary_base = int(salary_base * 1.15)
        elif arch == "frequent_jumper":
            if year_offset in (1, 3, 5):
                cur_tier = jump_tier(cur_tier)
                salary_base = int(salary_base * 1.20)
                if year_offset == 3:
                    cur_level = level_up(cur_level)
                job_changes += 1
        elif arch == "forced_pivot":
            # 在第 2-3 年被迫转行
            pivot_year = random.choice([2, 3])
            if year_offset == pivot_year:
                new_industry = pick_pivot_industry(cur_industry, start_year)
                if new_industry != cur_industry:
                    cur_industry = new_industry
                    industry_changes += 1
                cur_tier = min(7, cur_tier + 1)  # 降级一个 tier(转行常见现象)
                salary_base = int(salary_base * 0.85)
                job_changes += 1
            elif year_offset > pivot_year:
                if (year_offset - pivot_year) >= 2:
                    cur_level = level_up(cur_level)
                    salary_base = int(salary_base * 1.20)
        elif arch == "career_reboot":
            # 第 2 年内部转岗(同公司换岗)
            if year_offset == 2:
                cur_position = reboot_position(cur_position)
            elif year_offset == 4:
                cur_level = level_up(cur_level)
                salary_base = int(salary_base * 1.20)
        elif arch == "plateaued":
            # 5 年原地不动,薪资微涨
            salary_base = int(salary_base * 1.03)
        elif arch == "downhill":
            # 第 2 年公司倒闭/裁撤,被迫去 tier 更低的公司
            if year_offset == 2:
                cur_tier = min(7, cur_tier + 2)
                salary_base = int(salary_base * 0.70)
                job_changes += 1
            elif year_offset == 4:
                # 微恢复
                salary_base = int(salary_base * 1.10)
        elif arch == "rocket":
            # 跟对风口,每 2 年升一级,第 4 年升 lead
            if year_offset == 2:
                cur_level = level_up(cur_level, 2)
                salary_base = int(salary_base * 1.50)
            elif year_offset == 4:
                cur_level = "lead"
                salary_base = int(salary_base * 1.45)
                # 如果是从 startup 起步,5 年后跳大厂
                if cur_tier >= 5:
                    cur_tier = 2
                    job_changes += 1

        history.append({
            "year": year,
            "company_tier": cur_tier,
            "industry": cur_industry,
            "position": cur_position,
            "level": cur_level,
            "salary": int(salary_base * random.uniform(0.92, 1.08)),
        })

    return history, job_changes, industry_changes


def reboot_position(pos: str) -> str:
    """主动转岗的常见路径"""
    rules = {
        "content_operation": "product_manager",
        "user_operation": "product_manager",
        "marketing": "product_manager",
        "engineer_backend": "engineer_algorithm",
        "engineer_frontend": "product_manager",
        "ui_designer": "product_designer",
        "data_analyst": "product_manager",
    }
    return rules.get(pos, pos)


def base_salary_for(company_tier: int, level: str, industry: str) -> int:
    """该 (tier, level) 起步年薪。单位:元"""
    base = {
        ("graduate", 1): 220_000,
        ("graduate", 2): 160_000,
        ("graduate", 3): 130_000,
        ("graduate", 4): 100_000,
        ("graduate", 5): 95_000,
        ("graduate", 7): 120_000,
    }.get((level, company_tier), 140_000)

    # 行业溢价
    multiplier = {"internet": 1.0, "finance": 1.05, "auto_ev": 1.1, "tech_hardware": 1.05, "consulting": 1.1}.get(industry, 0.95)
    return int(base * multiplier)


def weighted_choice(dist: Dict):
    return random.choices(list(dist.keys()), weights=list(dist.values()), k=1)[0]


def generate_one(start_year: int) -> dict:
    school_tier = weighted_choice(SCHOOL_TIER_DIST)
    major_category = weighted_choice(MAJOR_DIST)
    first_company_tier = weighted_choice(FIRST_COMPANY_TIER_GIVEN_SCHOOL[school_tier])
    first_industry = weighted_choice(INDUSTRY_GIVEN_COMPANY_TIER[first_company_tier])
    first_position = weighted_choice(POSITION_GIVEN_MAJOR.get(major_category, POSITION_GIVEN_MAJOR["other"]))
    first_level = random.choices(["intern", "graduate", "junior"], weights=[0.05, 0.85, 0.10], k=1)[0]

    arch = pick_archetype()
    history, job_changes, industry_changes = build_story(
        arch, start_year, first_company_tier, first_industry, first_position, first_level,
    )

    last = history[-1]
    return dict(
        source="mock",
        source_metadata={"seed": "v3-2026-05-18", "archetype": arch},
        school_tier=school_tier,
        major_category=major_category,
        education_level="本科",
        gender=random.choices(["male", "female"], weights=[0.55, 0.45], k=1)[0],
        start_year=start_year,
        first_company_id=None,
        first_company_tier=first_company_tier,
        first_industry=first_industry,
        first_position_category=first_position,
        first_level=first_level,
        five_year_company_tier=last["company_tier"],
        five_year_industry=last["industry"],
        five_year_level=last["level"],
        five_year_salary=last["salary"],
        job_changes=job_changes,
        industry_changes=industry_changes,
        path_history=history,
        is_anonymized=True,
        k_anonymity=1000,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1000)
    parser.add_argument("--batch", type=int, default=200)
    args = parser.parse_args()

    sb = get_supabase()
    if not has_dashscope():
        print("(DASHSCOPE_API_KEY 未设置,纯统计抽样,不调 LLM)")

    years = [2019, 2020, 2021]
    per_year = args.count // 3 + 1
    errors_path = ROOT / "scripts" / ".cache" / "errors.jsonl"

    rows: List[dict] = []
    for y in years:
        for _ in range(per_year):
            try:
                rows.append(generate_one(y))
            except Exception as e:
                jsonl_append(errors_path, {"year": y, "error": str(e)})
    rows = rows[: args.count]

    # 统计原型分布,用于人工验证
    arch_counter: Dict[str, int] = {}
    for r in rows:
        a = r["source_metadata"]["archetype"]
        arch_counter[a] = arch_counter.get(a, 0) + 1
    print(f"prepared {len(rows)} rows. archetype distribution:")
    for k, v in sorted(arch_counter.items(), key=lambda x: -x[1]):
        print(f"  {k:20s} {v:4d}  ({v / len(rows) * 100:.1f}%)")

    print(f"inserting in batches of {args.batch}…")
    for i in tqdm(range(0, len(rows), args.batch)):
        chunk = rows[i : i + args.batch]
        try:
            sb.table("senior_paths").insert(chunk).execute()
        except Exception as e:
            print(f"batch {i} failed: {e}")
            jsonl_append(errors_path, {"batch_start": i, "error": str(e)})

    print(f"done. errors → {errors_path}")


if __name__ == "__main__":
    main()
