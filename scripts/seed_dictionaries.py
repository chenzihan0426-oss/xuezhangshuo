"""
seed_dictionaries.py
把基础字典数据写入 Supabase。供生产/CI 环境一次性初始化。
"""
from _common import get_supabase

SCHOOLS = [
    # (name, tier, province, is_c9, is_985, is_211)
    ("清华大学", 1, "北京", True, True, True),
    ("北京大学", 1, "北京", True, True, True),
    ("复旦大学", 1, "上海", True, True, True),
    ("上海交通大学", 1, "上海", True, True, True),
    ("浙江大学", 1, "浙江", True, True, True),
    ("南京大学", 1, "江苏", True, True, True),
    ("中国科学技术大学", 1, "安徽", True, True, True),
    ("哈尔滨工业大学", 1, "黑龙江", True, True, True),
    ("西安交通大学", 1, "陕西", True, True, True),
    # 985 非 C9
    ("武汉大学", 2, "湖北", False, True, True),
    ("华中科技大学", 2, "湖北", False, True, True),
    ("中山大学", 2, "广东", False, True, True),
    ("北京师范大学", 2, "北京", False, True, True),
    ("同济大学", 2, "上海", False, True, True),
    ("北京航空航天大学", 2, "北京", False, True, True),
    ("北京理工大学", 2, "北京", False, True, True),
    ("华东师范大学", 2, "上海", False, True, True),
    ("中国人民大学", 2, "北京", False, True, True),
    ("南开大学", 2, "天津", False, True, True),
    ("天津大学", 2, "天津", False, True, True),
    ("中南大学", 2, "湖南", False, True, True),
    ("湖南大学", 2, "湖南", False, True, True),
    ("吉林大学", 2, "吉林", False, True, True),
    ("大连理工大学", 2, "辽宁", False, True, True),
    ("东南大学", 2, "江苏", False, True, True),
    # 211 非 985
    ("苏州大学", 3, "江苏", False, False, True),
    ("郑州大学", 3, "河南", False, False, True),
    ("暨南大学", 3, "广东", False, False, True),
    ("华南师范大学", 3, "广东", False, False, True),
    ("北京交通大学", 3, "北京", False, False, True),
    ("华东理工大学", 3, "上海", False, False, True),
    ("上海大学", 3, "上海", False, False, True),
    ("江南大学", 3, "江苏", False, False, True),
    # 普通一本
    ("华南农业大学", 4, "广东", False, False, False),
    ("浙江工业大学", 4, "浙江", False, False, False),
    ("深圳大学", 4, "广东", False, False, False),
    ("南京工业大学", 4, "江苏", False, False, False),
    ("杭州电子科技大学", 4, "浙江", False, False, False),
    ("浙江师范大学", 4, "浙江", False, False, False),
    # 二本及以下
    ("广东工业大学", 5, "广东", False, False, False),
    ("广州大学", 5, "广东", False, False, False),
    ("武汉工程大学", 5, "湖北", False, False, False),
    ("浙江外国语学院", 5, "浙江", False, False, False),
    ("某二本学院A", 5, "其他", False, False, False),
    ("某二本学院B", 5, "其他", False, False, False),
    ("某三本学院C", 5, "其他", False, False, False),
]

MAJORS = [
    ("计算机科学与技术", "computer_science"),
    ("软件工程", "computer_science"),
    ("人工智能", "computer_science"),
    ("数据科学与大数据", "computer_science"),
    ("信息安全", "computer_science"),
    ("工商管理", "business"),
    ("市场营销", "business"),
    ("财务管理", "business"),
    ("会计学", "business"),
    ("国际经济与贸易", "business"),
    ("金融学", "finance"),
    ("经济学", "finance"),
    ("投资学", "finance"),
    ("机械工程", "engineering"),
    ("电子信息工程", "engineering"),
    ("自动化", "engineering"),
    ("土木工程", "engineering"),
    ("化学工程与工艺", "engineering"),
    ("法学", "law"),
    ("汉语言文学", "humanities"),
    ("英语", "humanities"),
    ("新闻学", "humanities"),
    ("教育学", "education"),
    ("设计学类", "design"),
    ("临床医学", "medicine"),
]

COMPANIES = [
    ("字节跳动", 1, "internet"),
    ("阿里巴巴", 1, "internet"),
    ("腾讯", 1, "internet"),
    ("美团", 1, "internet"),
    ("京东", 1, "internet"),
    ("百度", 1, "internet"),
    ("华为", 1, "tech_hardware"),
    ("小米", 1, "tech_hardware"),
    ("拼多多", 1, "internet"),
    ("小红书", 2, "internet"),
    ("滴滴", 2, "internet"),
    ("Shein", 2, "internet"),
    ("快手", 2, "internet"),
    ("B站", 2, "internet"),
    ("蔚来", 2, "auto_ev"),
    ("理想汽车", 2, "auto_ev"),
    ("小鹏", 2, "auto_ev"),
    # 金融头部券商 / 投行 (T1)
    ("中信证券", 1, "finance"),
    ("中金公司", 1, "finance"),
    ("中信建投", 1, "finance"),
    # 二线大型券商 (T2)
    ("华泰证券", 2, "finance"),
    ("海通证券", 2, "finance"),
    ("国泰君安", 2, "finance"),
    ("招商证券", 2, "finance"),
    ("申万宏源", 2, "finance"),
    ("广发证券", 2, "finance"),
    ("东方证券", 2, "finance"),
    # 银行(招行 T1,国有大行 / 全国性股份行 T2)
    ("招商银行", 1, "finance"),
    ("工商银行", 2, "finance"),
    ("建设银行", 2, "finance"),
    ("农业银行", 2, "finance"),
    ("中国银行", 2, "finance"),
    ("交通银行", 2, "finance"),
    ("平安银行", 2, "finance"),
    ("兴业银行", 2, "finance"),
    ("浦发银行", 2, "finance"),
    ("民生银行", 2, "finance"),
    ("光大银行", 2, "finance"),
    # 保险 (T1/T2)
    ("中国平安", 1, "finance"),
    ("中国人寿", 2, "finance"),
    ("中国太保", 2, "finance"),
    ("新华保险", 2, "finance"),
    # 公募基金 (T2)
    ("易方达基金", 2, "finance"),
    ("华夏基金", 2, "finance"),
    ("嘉实基金", 2, "finance"),
    ("南方基金", 2, "finance"),
    ("汇添富基金", 2, "finance"),
    ("广发基金", 2, "finance"),
    # 互联网金融 (T1/T2)
    ("蚂蚁集团", 1, "finance"),
    ("陆金所", 2, "finance"),
    # 外资投行 / 顶级 PE / 政策性银行 / 互联网银行 (T1 顶部)
    ("高盛", 1, "finance"),
    ("摩根士丹利", 1, "finance"),
    ("摩根大通", 1, "finance"),
    ("瑞银", 1, "finance"),
    ("高瓴资本", 1, "finance"),
    ("国家开发银行", 1, "finance"),
    ("微众银行", 1, "finance"),
    # 二线大型券商扩 (T2)
    ("国信证券", 2, "finance"),
    ("中国银河", 2, "finance"),
    ("中泰证券", 2, "finance"),
    ("长江证券", 2, "finance"),
    ("光大证券", 2, "finance"),
    ("方正证券", 2, "finance"),
    ("东方财富", 2, "finance"),
    ("兴业证券", 2, "finance"),
    # 政策性银行 (T2)
    ("中国进出口银行", 2, "finance"),
    ("中国农业发展银行", 2, "finance"),
    # 头部城商行 (T2)
    ("北京银行", 2, "finance"),
    ("上海银行", 2, "finance"),
    ("江苏银行", 2, "finance"),
    ("宁波银行", 2, "finance"),
    ("南京银行", 2, "finance"),
    ("杭州银行", 2, "finance"),
    # 股份行扩 (T2)
    ("广发银行", 2, "finance"),
    ("华夏银行", 2, "finance"),
    # 保险扩 (T2)
    ("中国人保", 2, "finance"),
    ("泰康保险", 2, "finance"),
    ("友邦保险", 2, "finance"),
    ("阳光保险", 2, "finance"),
    # 公募基金扩 (T2)
    ("富国基金", 2, "finance"),
    ("博时基金", 2, "finance"),
    ("招商基金", 2, "finance"),
    ("工银瑞信", 2, "finance"),
    ("建信基金", 2, "finance"),
    # 互金 / 支付 / 信托 (T2)
    ("京东金融", 2, "finance"),
    ("度小满金融", 2, "finance"),
    ("中信信托", 2, "finance"),
    ("平安信托", 2, "finance"),
    ("中国移动", 5, "telecom"),
    ("国家电网", 5, "energy"),
    ("恒大", 4, "real_estate"),
    ("万科", 4, "real_estate"),
    ("新东方", 4, "education_training"),
    ("好未来", 4, "education_training"),
    ("普华永道", 2, "consulting"),
    ("麦肯锡", 2, "consulting"),
    ("德勤", 2, "consulting"),
    ("安永", 2, "consulting"),
    ("毕马威", 2, "consulting"),
    ("波士顿咨询", 1, "consulting"),
    ("贝恩咨询", 1, "consulting"),
    # 消费 / 餐饮 / 连锁 / 酒店 —— 用户常搜,之前不在库导致"查不到"
    ("星巴克", 3, "consumer_service"),
    ("瑞幸咖啡", 3, "consumer_service"),
    ("海底捞", 3, "consumer_service"),
    ("麦当劳", 3, "consumer_service"),
    ("肯德基", 3, "consumer_service"),
    ("华住酒店", 3, "consumer_service"),
    ("喜茶", 3, "consumer_service"),
    ("名创优品", 3, "consumer_service"),
    ("西贝莜面村", 4, "consumer_service"),
    ("农夫山泉", 3, "consumer_service"),
    ("元气森林", 3, "consumer_service"),
    ("蜜雪冰城", 4, "consumer_service"),
    # 快消 / 制造 / 车企扩
    ("宝洁", 2, "consumer_service"),
    ("联合利华", 2, "consumer_service"),
    ("欧莱雅", 2, "consumer_service"),
    ("比亚迪", 1, "auto_ev"),
    ("特斯拉", 1, "auto_ev"),
    ("宁德时代", 1, "tech_hardware"),
    ("大疆", 1, "tech_hardware"),
    ("OPPO", 2, "tech_hardware"),
    ("vivo", 2, "tech_hardware"),
    ("网易", 1, "internet"),
    ("携程", 2, "internet"),
    ("一家不知名创业公司", 7, "startup"),
]

POSITIONS = [
    ("engineer_backend", "后端开发"),
    ("engineer_frontend", "前端开发"),
    ("engineer_mobile", "移动开发"),
    ("engineer_algorithm", "算法工程师"),
    ("engineer_data", "数据工程师"),
    ("product_manager", "产品经理"),
    ("product_designer", "产品设计"),
    ("ui_designer", "UI 设计师"),
    ("content_operation", "内容运营"),
    ("user_operation", "用户运营"),
    ("marketing", "市场营销"),
    ("sales_b2b", "B2B 销售"),
    ("sales_b2c", "B2C 销售"),
    ("hr", "人力资源"),
    ("finance_analyst", "财务分析"),
    ("investment_analyst", "投资分析"),
    ("consultant", "咨询顾问"),
    ("data_analyst", "数据分析"),
    ("customer_service", "客服"),
    ("translation", "翻译"),
    ("teacher_k12", "K12 教师"),
    ("civil_servant", "公务员"),
]


def _insert_missing(sb, table: str, key: str, rows: list):
    """这些字典表没有 name 的唯一约束,upsert(on_conflict) 用不了。
    改成:查出已存在的 key,只插缺的。幂等,可重复跑不产生重复。"""
    existing = set()
    page = 0
    while True:
        chunk = sb.table(table).select(key).range(page * 1000, page * 1000 + 999).execute().data or []
        existing.update(r[key] for r in chunk)
        if len(chunk) < 1000:
            break
        page += 1
    to_add = [r for r in rows if r[key] not in existing]
    if to_add:
        sb.table(table).insert(to_add).execute()
    print(f"  {table}: 已有 {len(existing)},新增 {len(to_add)}")


def main():
    sb = get_supabase()

    print(f"seeding {len(SCHOOLS)} schools…")
    _insert_missing(sb, "schools", "name", [
        dict(name=n, tier=t, province=p, is_c9=c9, is_985=m985, is_211=m211)
        for (n, t, p, c9, m985, m211) in SCHOOLS
    ])

    print(f"seeding {len(MAJORS)} majors…")
    _insert_missing(sb, "majors", "name", [dict(name=n, category=c) for (n, c) in MAJORS])

    print(f"seeding {len(COMPANIES)} companies…")
    _insert_missing(sb, "companies", "name", [dict(name=n, tier=t, industry=i) for (n, t, i) in COMPANIES])

    print(f"seeding {len(POSITIONS)} positions…")
    _insert_missing(sb, "positions", "category", [dict(category=c, name=n) for (c, n) in POSITIONS])

    print("done.")


if __name__ == "__main__":
    main()
