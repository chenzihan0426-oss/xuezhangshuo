"""
seed_environment_factors.py
把行业景气 / AI 风险 / 政策事件写入 environment_factors 表。
保持与 lib/constants.ts 同步。
"""
from _common import get_supabase

INDUSTRY_INDEX = {
    "internet":           {2020: 1.0, 2021: 1.1,  2022: 0.7,  2023: 0.5,  2024: 0.6,  2025: 0.65, 2026: 0.7},
    "finance":            {2020: 1.0, 2021: 1.0,  2022: 0.95, 2023: 0.9,  2024: 0.85, 2025: 0.85, 2026: 0.85},
    "education_training": {2020: 1.0, 2021: 0.3,  2022: 0.15, 2023: 0.15, 2024: 0.2,  2025: 0.25, 2026: 0.3},
    "real_estate":        {2020: 1.0, 2021: 0.9,  2022: 0.4,  2023: 0.3,  2024: 0.3,  2025: 0.35, 2026: 0.4},
    "auto_ev":            {2020: 0.8, 2021: 1.2,  2022: 1.3,  2023: 1.25, 2024: 1.1,  2025: 1.0,  2026: 0.95},
    "tech_hardware":      {2020: 1.0, 2021: 1.05, 2022: 1.0,  2023: 1.1,  2024: 1.15, 2025: 1.2,  2026: 1.2},
    "telecom":            {2020: 1.0, 2021: 1.0,  2022: 1.0,  2023: 1.0,  2024: 1.0,  2025: 1.0,  2026: 1.0},
    "energy":             {2020: 1.0, 2021: 1.0,  2022: 1.05, 2023: 1.1,  2024: 1.1,  2025: 1.1,  2026: 1.1},
    "consulting":         {2020: 1.0, 2021: 1.05, 2022: 1.0,  2023: 0.95, 2024: 0.9,  2025: 0.9,  2026: 0.9},
    "startup":            {2020: 1.0, 2021: 1.2,  2022: 0.8,  2023: 0.6,  2024: 0.7,  2025: 0.75, 2026: 0.8},
}

AI_RISK = {
    "content_operation":   0.70,
    "data_analyst":        0.60,
    "customer_service":    0.85,
    "translation":         0.80,
    "engineer_backend":    0.30,
    "engineer_frontend":   0.40,
    "engineer_algorithm":  0.20,
    "engineer_data":       0.35,
    "product_manager":     0.40,
    "product_designer":    0.45,
    "ui_designer":         0.55,
    "marketing":           0.50,
    "sales_b2b":           0.25,
    "sales_b2c":           0.40,
    "hr":                  0.45,
    "finance_analyst":     0.55,
    "investment_analyst":  0.40,
    "consultant":          0.35,
    "teacher_k12":         0.25,
    "civil_servant":       0.10,
    "user_operation":      0.55,
}

POLICY_EVENTS = [
    {"industry": "education_training", "year": 2021, "impact": 0.30, "name": "双减政策"},
    {"industry": "real_estate", "year": 2022, "impact": 0.50, "name": "三道红线 + 爆雷潮"},
    {"industry": "internet", "year": 2023, "impact": 0.70, "name": "互联网大裁员"},
    {"industry": "real_estate", "year": 2024, "impact": 0.85, "name": "保交楼,需求未恢复"},
]


def main():
    sb = get_supabase()

    rows = []
    for industry, series in INDUSTRY_INDEX.items():
        for year, v in series.items():
            rows.append(dict(factor_type="industry_index", industry=industry, year=year, value=v))
    print(f"upsert {len(rows)} industry_index rows")
    sb.table("environment_factors").insert(rows).execute()

    rows = [dict(factor_type="ai_risk", position_category=k, value=v) for k, v in AI_RISK.items()]
    print(f"upsert {len(rows)} ai_risk rows")
    sb.table("environment_factors").insert(rows).execute()

    rows = []
    for ev in POLICY_EVENTS:
        rows.append(dict(
            factor_type="policy_event",
            industry=ev["industry"],
            year=ev["year"],
            value=ev["impact"],
            metadata={"event_name": ev["name"]},
        ))
    print(f"upsert {len(rows)} policy_event rows")
    sb.table("environment_factors").insert(rows).execute()

    print("done.")


if __name__ == "__main__":
    main()
