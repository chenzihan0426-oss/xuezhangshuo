"""
boost_top_companies.py — 头部公司专项补 mock 数据

针对 tier=1 头部公司,各补足若干 graduate path 覆盖热门岗位,
保证用户填这些公司时,fetchCandidates 的 L1/L2(同公司 anchor)能命中。

每家公司 × 每个热门岗位 × N 条(默认 N=8),总共 9 公司 × 6 岗位 × 8 = 432 条左右。
"""
import argparse
import os
import random
import sys

# 让 import 能从同级目录拉
sys.path.insert(0, os.path.dirname(__file__))

from generate_mock_data import build_story  # noqa: E402
from _common import get_supabase  # noqa: E402

TARGET_COMPANIES = [
    # (id, name, industry, tier, positions)
    # tier=1 互联网大厂(internet)和 tech_hardware,用工程师 / PM 为主
    (1, "字节跳动", "internet", 1, "tech"),
    (2, "阿里巴巴", "internet", 1, "tech"),
    (3, "腾讯", "internet", 1, "tech"),
    (4, "美团", "internet", 1, "tech"),
    (5, "京东", "internet", 1, "tech"),
    (6, "百度", "internet", 1, "tech"),
    (12, "拼多多", "internet", 1, "tech"),
    (7, "华为", "tech_hardware", 1, "tech"),
    (8, "小米", "tech_hardware", 1, "tech"),
    # tier=3 消费服务(餐饮 / 连锁 / 酒店),用运营 / 市场 / 销售 / 财务
    (30, "星巴克", "consumer_service", 3, "service"),
    (31, "瑞幸咖啡", "consumer_service", 3, "service"),
    (32, "海底捞", "consumer_service", 3, "service"),
    (33, "麦当劳", "consumer_service", 3, "service"),
    (34, "华住酒店", "consumer_service", 3, "service"),
    (35, "西贝莜面村", "consumer_service", 4, "service"),
    (36, "喜茶", "consumer_service", 3, "service"),
    (37, "名创优品", "consumer_service", 3, "service"),
]

POSITIONS_BY_KIND = {
    "tech": [
        "product_manager",
        "engineer_backend",
        "engineer_algorithm",
        "engineer_frontend",
        "user_operation",
        "marketing",
    ],
    "service": [
        "marketing",
        "user_operation",
        "sales_b2c",
        "hr",
        "product_manager",
        "finance_analyst",
    ],
}

ARCHETYPES = [
    "steady_climber",
    "one_jump_promo",
    "frequent_jumper",
    "forced_pivot",
    "career_reboot",
    "plateaued",
    "rocket",
]


def boost(per_position: int = 8, only_kind: str | None = None):
    sb = get_supabase()
    rows = []
    targets = [
        c for c in TARGET_COMPANIES if not only_kind or c[4] == only_kind
    ]
    for cid, cname, industry, tier, kind in targets:
        positions = POSITIONS_BY_KIND[kind]
        # 消费服务起步薪资更接地气,学校层级也更分散
        major_pool = (
            ["computer_science", "business", "engineering"]
            if kind == "tech"
            else ["business", "humanities", "design", "other"]
        )
        for pos in positions:
            for _ in range(per_position):
                start_year = random.choice([2019, 2020, 2021])
                arch = random.choices(
                    ARCHETYPES, weights=[0.25, 0.20, 0.10, 0.15, 0.10, 0.10, 0.10], k=1
                )[0]
                first_level = random.choices(
                    ["graduate", "intern", "junior"], weights=[0.85, 0.05, 0.10], k=1
                )[0]
                history, jc, ic = build_story(
                    arch, start_year, tier, industry, pos, first_level
                )
                if history:
                    history[0]["company_name"] = cname
                last = history[-1]
                rows.append(
                    {
                        "source": "mock",
                        "source_metadata": {
                            "seed": "boost-v2",
                            "archetype": arch,
                            "anchor_company": cname,
                        },
                        "school_tier": random.choices(
                            [1, 2, 3, 4], weights=[0.15, 0.35, 0.30, 0.20], k=1
                        )[0],
                        "major_category": random.choice(major_pool),
                        "education_level": "本科",
                        "gender": random.choices(
                            ["male", "female"], weights=[0.55, 0.45], k=1
                        )[0],
                        "start_year": start_year,
                        "first_company_id": cid,
                        "first_company_tier": tier,
                        "first_industry": industry,
                        "first_position_category": pos,
                        "first_level": first_level,
                        "five_year_company_tier": last["company_tier"],
                        "five_year_industry": last["industry"],
                        "five_year_level": last["level"],
                        "five_year_salary": last["salary"],
                        "job_changes": jc,
                        "industry_changes": ic,
                        "path_history": history,
                        "is_anonymized": True,
                        "k_anonymity": 1000,
                    }
                )
    BATCH = 100
    for i in range(0, len(rows), BATCH):
        sb.table("senior_paths").insert(rows[i : i + BATCH]).execute()
    print(f"Inserted {len(rows)} boost rows across {len(targets)} companies")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-position", type=int, default=8)
    parser.add_argument(
        "--only-kind",
        choices=["tech", "service"],
        default=None,
        help="只跑指定类型的公司(tech / service)",
    )
    args = parser.parse_args()
    boost(args.per_position, args.only_kind)
