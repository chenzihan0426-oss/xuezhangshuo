"""
build_embeddings.py

给 senior_paths 表里所有还没 background_vec 的行,生成向量并写回。
"""
import os
import sys
from typing import List

import numpy as np
from tqdm import tqdm

from _common import get_supabase, has_dashscope

VECTOR_DIM = 128


def background_to_text(row: dict) -> str:
    return "|".join([
        f"school_tier={row['school_tier']}",
        f"major={row['major_category']}",
        f"edu={row.get('education_level') or '本科'}",
        f"gpa=unknown",
        f"internships=0",
        f"top_intern=0",
    ])


def embed_via_tongyi(texts: List[str]) -> List[List[float]]:
    """走通义千问 text-embedding-v2"""
    import dashscope
    dashscope.api_key = os.environ["DASHSCOPE_API_KEY"]

    out: List[List[float]] = []
    for i in range(0, len(texts), 25):
        batch = texts[i : i + 25]
        resp = dashscope.TextEmbedding.call(
            model=dashscope.TextEmbedding.Models.text_embedding_v2,
            input=batch,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"dashscope error: {resp.message}")
        for emb in resp.output["embeddings"]:
            vec = emb["embedding"][:VECTOR_DIM]
            if len(vec) < VECTOR_DIM:
                vec = vec + [0.0] * (VECTOR_DIM - len(vec))
            norm = np.linalg.norm(vec) or 1.0
            out.append((np.array(vec) / norm).tolist())
    return out


def embed_via_hash(texts: List[str]) -> List[List[float]]:
    """
    无 API key 时的降级:基于 SHA-256 的确定性 hash 向量。
    跟 lib/tongyi.ts 的 stableHashVector 实现完全一致 ——
    同一段文本,Python 和 TS 必须给出同样的向量,否则匹配引擎找不到。
    """
    import hashlib
    import struct
    out = []
    for t in texts:
        buf = hashlib.sha256(t.encode("utf-8")).digest()
        while len(buf) < VECTOR_DIM * 4:
            buf += hashlib.sha256(buf).digest()
        floats = []
        for i in range(VECTOR_DIM):
            u = struct.unpack("<I", buf[i * 4 : i * 4 + 4])[0]
            floats.append((u / 0xFFFFFFFF) * 2 - 1)
        norm = (sum(v * v for v in floats)) ** 0.5 or 1.0
        out.append([v / norm for v in floats])
    return out


def main():
    sb = get_supabase()
    # 只挑还没有向量的行
    rows = sb.table("senior_paths").select("id, school_tier, major_category, education_level, background_vec").is_("background_vec", "null").limit(5000).execute().data
    if not rows:
        print("no rows need embedding")
        return

    texts = [background_to_text(r) for r in rows]
    if has_dashscope():
        vecs = embed_via_tongyi(texts)
    else:
        print("(DASHSCOPE_API_KEY 未设置,使用 hash 伪向量降级)")
        vecs = embed_via_hash(texts)

    for r, v in tqdm(zip(rows, vecs), total=len(rows)):
        sb.table("senior_paths").update({"background_vec": v}).eq("id", r["id"]).execute()

    print(f"updated {len(rows)} rows.")


if __name__ == "__main__":
    main()
