"""
boost_top_companies.py — 头部公司专项补 mock 数据

针对 tier=1 头部公司,各补足若干 graduate path 覆盖热门岗位,
保证用户填这些公司时,fetchCandidates 的 L1/L2(同公司 anchor)能命中。

每家公司 × 每个热门岗位 × N 条(默认 N=8)。
覆盖范围:互联网/科技大厂 + 消费服务 + 金融头部(券商/银行/保险/基金) ≈ 40 家。
默认配置下生成约 40 × 6 × 8 = 1900 条左右。
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
    # tier=1 金融头部券商 / 投行 / 银行 / 保险 / 互金 — finance 岗
    # 注意:id 这里只是占位,boost 写入 senior_paths 时实际匹配靠 first_industry + first_company_tier。
    # 真实 company_id 由 dict 字典动态分配,boost 不强绑定 company_id 也能跑。
    (101, "中信证券", "finance", 1, "finance"),
    (102, "中金公司", "finance", 1, "finance"),
    (103, "中信建投", "finance", 1, "finance"),
    (104, "招商银行", "finance", 1, "finance"),
    (105, "中国平安", "finance", 1, "finance"),
    (106, "蚂蚁集团", "finance", 1, "finance"),
    # tier=2 二线券商 / 国有大行 / 股份行 / 基金 / 保险二线
    (201, "华泰证券", "finance", 2, "finance"),
    (202, "海通证券", "finance", 2, "finance"),
    (203, "国泰君安", "finance", 2, "finance"),
    (204, "申万宏源", "finance", 2, "finance"),
    (205, "广发证券", "finance", 2, "finance"),
    (206, "招商证券", "finance", 2, "finance"),
    (211, "工商银行", "finance", 2, "finance"),
    (212, "建设银行", "finance", 2, "finance"),
    (213, "农业银行", "finance", 2, "finance"),
    (214, "中国银行", "finance", 2, "finance"),
    (215, "平安银行", "finance", 2, "finance"),
    (216, "兴业银行", "finance", 2, "finance"),
    (221, "中国人寿", "finance", 2, "finance"),
    (222, "中国太保", "finance", 2, "finance"),
    (231, "易方达基金", "finance", 2, "finance"),
    (232, "华夏基金", "finance", 2, "finance"),
    (233, "嘉实基金", "finance", 2, "finance"),
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
    "finance": [
        "investment_analyst",
        "finance_analyst",
        "data_analyst",
        "consultant",
        "sales_b2b",
        "engineer_backend",  # 金融科技 / IT 岗,占金融招聘约 15%
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
    # 用真实 companies.id 覆盖硬编码 cid —— 否则 first_company_id 对不上用户提交的真实自增 id,L1/L2 永远命不中。
    # 字典里没有的公司(回查不到)保持 None,退回 tier+行业兜底。
    name_to_id: dict[str, int] = {}
    try:
        for c in sb.table("companies").select("id, name").execute().data or []:
            name_to_id[c["name"]] = c["id"]
        missing = [c[1] for c in targets if c[1] not in name_to_id]
        if missing:
            print(f"⚠ 以下 boost 目标公司不在 companies 字典,将以 None 写入(仅 tier+行业匹配): {missing}")
    except Exception as e:
        print(f"⚠ 拉取 companies 失败,boost first_company_id 全部 None: {e}")

    for cid, cname, industry, tier, kind in targets:
        real_id = name_to_id.get(cname)
        positions = POSITIONS_BY_KIND[kind]
        # 消费服务起步薪资更接地气,学校层级也更分散;金融岗主要来自金融 / 商科 / CS
        if kind == "tech":
            major_pool = ["computer_science", "business", "engineering"]
        elif kind == "finance":
            major_pool = ["finance", "business", "computer_science", "engineering"]
        else:
            major_pool = ["business", "humanities", "design", "other"]
        for pos in positions:
            for _ in range(per_position):
                start_year = random.choice([2019, 2020, 2021])
                arch = random.choices(
                    ARCHETYPES, weights=[0.25, 0.20, 0.10, 0.15, 0.10, 0.10, 0.10], k=1
                )[0]
                first_level = random.choices(
                    ["graduate", "intern", "junior"], weights=[0.85, 0.05, 0.10], k=1
                )[0]
                school_tier = random.choices(
                    [1, 2, 3, 4], weights=[0.15, 0.35, 0.30, 0.20], k=1
                )[0]
                history, jc, ic = build_story(
                    arch, start_year, tier, industry, pos, first_level, school_tier
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
                        "school_tier": school_tier,
                        "major_category": random.choice(major_pool),
                        "education_level": "本科",
                        "gender": random.choices(
                            ["male", "female"], weights=[0.55, 0.45], k=1
                        )[0],
                        "start_year": start_year,
                        "first_company_id": real_id,
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
        choices=["tech", "service", "finance"],
        default=None,
        help="只跑指定类型的公司(tech / service / finance)",
    )
    args = parser.parse_args()
    boost(args.per_position, args.only_kind)
