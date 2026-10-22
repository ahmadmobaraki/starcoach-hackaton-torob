#!/usr/bin/env python3
"""Build the read/write SQLite database for هم‌قدم from the Torob CSVs."""

from __future__ import annotations

import csv
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "torob-dataset"
OUT = ROOT / "data" / "torob.db"

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
SPACE_RE = re.compile(r"[^\w\s]+", re.UNICODE)
MULTI_SPACE_RE = re.compile(r"\s+", re.UNICODE)

# Top-level groups used by the UI. The original category stays on the card.
CATEGORY_GROUPS = {
    "phone": [
        "گوشی موبایل", "موبایل", "لوازم جانبی موبایل و تبلت", "شارژر گوشی",
        "کیف و کاور گوشی", "باتری گوشی موبایل", "تاچ و ال سی دی گوشی و تبلت",
        "هدفون، هدست و هندزفری", "اسپیکر و سیستم صوتی",
    ],
    "watch": ["ساعت مچی عقربه‌ ای و دیجیتالی", "ساعت هوشمند", "ساعت"],
    "lighting": [
        "لوستر و چراغ تزئینی", "چراغ پنلی و سقفی", "چراغ خطی و زیر کابینتی",
        "لامپ LED و کم مصرف", "سایر لامپ و چراغ", "پروژکتور و وال واشر",
        "ریسه و شلنگ نوری", "قاب لامپ و چراغ", "سر پیچ لامپ",
        "لوازم جانبی نور و روشنایی", "چراغ خیابانی و پارکی",
    ],
    "home": [
        "جارو برقی، جاروشارژی و بخارشوی", "لوازم یدکی جارو برقی، جاروشارژی و بخارشوی",
        "پمپ خانگی و صنعتی", "ژنراتور و موتور برق", "لوازم آشپزخانه",
        "سایر لوازم خانگی", "کولر و تهویه", "شوفاژ و پکیج",
    ],
    "tools": [
        "سیم و کابل برق ساختمان", "کلید و پریز", "کلید و فیوز مینیاتوری",
        "سوکت و کانکتور", "کابلشو و سرسیم", "رله و بیمتال", "کنتاکتور",
        "درایو و اینورتر", "اتوماسیون صنعتی", "ابزار دستی", "ابزار برقی",
        "دوربین مدار بسته", "تجهیزات شبکه", "سایر ابزار و تجهیزات",
    ],
}

# Build a reverse map once.
CATEGORY_TO_GROUP = {
    category: group for group, cats in CATEGORY_GROUPS.items() for category in cats
}


def norm(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("ي", "ی").replace("ك", "ک").replace("\u200c", " ")
    value = value.translate(PERSIAN_DIGITS).lower()
    value = SPACE_RE.sub(" ", value)
    return MULTI_SPACE_RE.sub(" ", value).strip()


def clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value in ("", "null", "NULL", "None"):
        return None
    return value


def as_int(value: str | None) -> int | None:
    value = clean(value)
    if value is None:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def group_for(category: str | None) -> str:
    if not category:
        return "other"
    return CATEGORY_TO_GROUP.get(category, "other")


def slim_specs(raw: str | None, group: str) -> str | None:
    """Keep the useful part of specs only for the demo categories."""
    if group not in ("phone", "watch", "lighting") or not raw:
        return None
    try:
        items = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(items, list):
        return None
    slim = []
    for item in items[:12]:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "").strip()
        value = str(item.get("value") or "").strip()
        if key and value:
            slim.append({"key": key[:60], "value": value[:120]})
    return json.dumps(slim, ensure_ascii=False, separators=(",", ":")) if slim else None


def slim_images(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        items = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if isinstance(items, list):
        items = [x for x in items if isinstance(x, str)][:3]
        return json.dumps(items, ensure_ascii=False, separators=(",", ":")) if items else None
    return None


def connect() -> sqlite3.Connection:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    con = sqlite3.connect(OUT)
    con.execute("PRAGMA journal_mode=OFF")
    con.execute("PRAGMA synchronous=OFF")
    con.execute("PRAGMA temp_store=MEMORY")
    con.execute("PRAGMA cache_size=-200000")
    return con


SCHEMA = """
CREATE TABLE shops (
  shop_id TEXT PRIMARY KEY,
  name TEXT,
  category_names TEXT,
  address TEXT,
  lat REAL,
  lon REAL,
  location_label TEXT,
  contacts TEXT,
  payment_options TEXT,
  supports_fast_delivery INTEGER,
  website_url TEXT,
  instagram TEXT,
  weekly_hours TEXT
);

CREATE TABLE products (
  product_id TEXT PRIMARY KEY,
  persian_title TEXT,
  brand_name TEXT,
  category_name TEXT,
  category_group TEXT,
  model TEXT,
  image_urls TEXT,
  specs TEXT,
  search_text TEXT
);

CREATE TABLE offers (
  offer_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  price_toman INTEGER,
  last_price_changed_at TEXT,
  warranty TEXT,
  seller_title TEXT,
  description TEXT
);

CREATE VIRTUAL TABLE products_fts USING fts5(
  product_id UNINDEXED,
  title,
  brand,
  category,
  model,
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  intent_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE confirmations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT,
  confirmed_at TEXT,
  confirmed_price INTEGER,
  confirmed_hours TEXT,
  note TEXT,
  thread_id TEXT NOT NULL,
  UNIQUE(run_id, product_id, shop_id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  parsed TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE agent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_shop ON offers(shop_id);
CREATE INDEX idx_products_group ON products(category_group);
CREATE INDEX idx_offers_price ON offers(price_toman);
CREATE INDEX idx_shops_label ON shops(location_label);
CREATE INDEX idx_confirmations_run ON confirmations(run_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_events_run ON agent_events(run_id);
"""


def main() -> int:
    if not DATA.exists():
        print(f"missing dataset: {DATA}", file=sys.stderr)
        return 1

    started = time.time()
    con = connect()
    con.executescript(SCHEMA)

    print("shops...", flush=True)
    with open(DATA / "shops.csv", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = []
        for r in reader:
            rows.append(
                (
                    r["shop_id"],
                    clean(r["name"]),
                    clean(r["category_names"]),
                    clean(r["address"]),
                    float(r["lat"]) if clean(r["lat"]) else None,
                    float(r["lon"]) if clean(r["lon"]) else None,
                    clean(r["location_label"]),
                    clean(r["contacts"]),
                    clean(r["payment_options"]),
                    1 if clean(r["supports_fast_delivery"]) == "true" else 0,
                    clean(r["website_url"]),
                    clean(r["instagram"]),
                    clean(r["weekly_hours"]),
                )
            )
            if len(rows) >= 2000:
                con.executemany("INSERT INTO shops VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
                rows.clear()
        if rows:
            con.executemany("INSERT INTO shops VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)

    print("products...", flush=True)
    with open(DATA / "products.csv", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        products = []
        fts = []
        for r in reader:
            title = clean(r["persian_title"])
            brand = clean(r["brand_name"])
            category = clean(r["category_name"])
            model = clean(r["model"])
            search_text = norm(" ".join(filter(None, [title, brand, category, model])))
            group = group_for(category)
            products.append(
                (
                    r["product_id"], title, brand, category, group,
                    model, slim_images(clean(r["image_urls"])),
                    slim_specs(clean(r["specs"]), group), search_text,
                )
            )
            fts.append((r["product_id"], norm(title), norm(brand), norm(category), norm(model)))
            if len(products) >= 2000:
                con.executemany("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?)", products)
                con.executemany("INSERT INTO products_fts VALUES (?,?,?,?,?)", fts)
                products.clear()
                fts.clear()
        if products:
            con.executemany("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?)", products)
            con.executemany("INSERT INTO products_fts VALUES (?,?,?,?,?)", fts)

    print("offers...", flush=True)
    with open(DATA / "offers.csv", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        offers = []
        for r in reader:
            offers.append(
                (
                    r["offer_id"], r["product_id"], r["shop_id"],
                    as_int(r["price_toman"]), clean(r["last_price_changed_at"]),
                    clean(r["warranty"]), clean(r["seller_title"]), clean(r["description"]),
                )
            )
            if len(offers) >= 5000:
                con.executemany("INSERT INTO offers VALUES (?,?,?,?,?,?,?,?)", offers)
                offers.clear()
        if offers:
            con.executemany("INSERT INTO offers VALUES (?,?,?,?,?,?,?,?)", offers)

    con.commit()
    print("optimizing...", flush=True)
    con.execute("INSERT INTO products_fts(products_fts) VALUES('optimize')")
    con.commit()
    con.execute("VACUUM")
    con.commit()

    for table in ("shops", "products", "offers"):
        count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count:,}")
    con.close()
    print(f"built {OUT} in {time.time() - started:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
