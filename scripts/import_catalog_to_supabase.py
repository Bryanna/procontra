#!/usr/bin/env python3
"""Idempotently import the PROCONTRA product catalog through Supabase REST."""

from __future__ import annotations

import argparse
import json
import os
import urllib.request
from pathlib import Path
from typing import Callable, Iterable


Transport = Callable[..., object]
REQUIRED_ENVIRONMENT = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_environment(path: Path, environ: dict[str, str] | os._Environ[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    values.update({key: value for key, value in environ.items() if value})

    missing = [name for name in REQUIRED_ENVIRONMENT if not values.get(name)]
    if missing:
        raise ValueError(f"Faltan variables requeridas: {', '.join(missing)}")
    return values


def build_product_rows(payload: dict) -> list[dict]:
    metadata = payload.get("metadata", {})
    source_file = str(metadata.get("sourceFile", "catalog"))
    source_modified = str(metadata.get("sourceModifiedAt", "unknown"))
    catalog_version = f"{source_file}@{source_modified}"

    rows: list[dict] = []
    seen: set[str] = set()
    for product in payload.get("products", []):
        code = str(product.get("code", "")).strip()
        name = str(product.get("name", "")).strip()
        if not code or not name:
            raise ValueError("Cada producto requiere code y name")
        if code in seen:
            raise ValueError(f"Código duplicado en catálogo: {code}")
        seen.add(code)
        rows.append({
            "f_codigo": code,
            "f_nombre": name,
            "f_activo": True,
            "f_version_catalogo": catalog_version,
        })
    return rows


def batches(rows: list[dict], batch_size: int) -> Iterable[list[dict]]:
    if batch_size < 1:
        raise ValueError("batch_size debe ser mayor que cero")
    for start in range(0, len(rows), batch_size):
        yield rows[start : start + batch_size]


def upsert_products(
    rows: list[dict],
    supabase_url: str,
    service_role_key: str,
    *,
    batch_size: int = 500,
    transport: Transport = urllib.request.urlopen,
) -> dict[str, int]:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/t_productos?on_conflict=f_idempresa,f_idsucursal,f_app,f_codigo"
    batch_count = 0
    for batch in batches(rows, batch_size):
        request = urllib.request.Request(
            endpoint,
            data=json.dumps(batch, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Prefer": "resolution=merge-duplicates,return=minimal",
                "Content-Profile": "api",
            },
        )
        with transport(request, timeout=120) as response:
            response.read()
        batch_count += 1
    return {"products": len(rows), "batches": batch_count}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=Path("src/data/inventory-catalog.json"))
    parser.add_argument("--env-file", type=Path, default=Path(".env.local"))
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    payload = read_json(args.catalog)
    rows = build_product_rows(payload)
    if args.dry_run:
        report = {"products": len(rows), "batches": len(list(batches(rows, args.batch_size))), "dryRun": True}
    else:
        environment = load_environment(args.env_file, os.environ)
        report = upsert_products(
            rows,
            environment["SUPABASE_URL"],
            environment["SUPABASE_SERVICE_ROLE_KEY"],
            batch_size=args.batch_size,
        )
        report["dryRun"] = False
    report["source"] = payload.get("metadata", {}).get("sourceFile")
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
