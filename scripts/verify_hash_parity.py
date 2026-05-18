"""验证 Python 端的 stable hash 向量和 TS 端一致。
用法:
  python verify_hash_parity.py
  → 打印前 5 维数字
然后跟 node 端跑 verify-hash-parity.mjs 对比
"""
from build_embeddings import embed_via_hash

samples = [
    "school_tier=3|major=computer_science|edu=本科|gpa=unknown|internships=0|top_intern=0",
    "school_tier=1|major=finance|edu=硕士|gpa=3.5+|internships=2|top_intern=1",
    "hello",
]

for s in samples:
    v = embed_via_hash([s])[0]
    print(f"\nText: {s!r}")
    print(f"  dim={len(v)}")
    print(f"  first5={[round(x, 8) for x in v[:5]]}")
    print(f"  norm={round(sum(x*x for x in v) ** 0.5, 6)}")
