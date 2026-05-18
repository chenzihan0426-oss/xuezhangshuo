"""
脚本通用 helpers
"""
import json
import os
import random
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

random.seed(20260518)  # 可复现


def get_supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env")
    return create_client(url, key)


def has_dashscope() -> bool:
    key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if not key:
        return False
    # 忽略明显的占位值
    return not (key in {"dummy", "sk-xxx", "xxx"} or key.startswith("dummy"))


def jsonl_append(path: Path, obj: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")
