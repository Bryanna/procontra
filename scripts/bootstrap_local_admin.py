#!/usr/bin/env python3
"""Create the first local PROCONTRA administrator without printing secrets."""

from __future__ import annotations

import argparse
import json
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def load_environment(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.strip() and not raw.lstrip().startswith("#") and "=" in raw:
            key, value = raw.split("=", 1)
            values[key.strip()] = value.strip()
    required = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise ValueError(f"Faltan variables requeridas: {', '.join(missing)}")
    return values


def write_credentials(path: Path, email: str, password: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(
            "PROCONTRA local bootstrap administrator\n"
            f"Email: {email}\n"
            f"Password: {password}\n"
            "Change this temporary password after HTTPS and the final institutional email are configured.\n"
        )
    path.chmod(0o600)


def safe_report(email: str, credentials_file: Path, _password: str) -> dict[str, object]:
    return {
        "created": True,
        "email": email,
        "credentialsFile": str(credentials_file),
        "credentialsMode": "0600",
    }


def api_request(
    method: str,
    url: str,
    service_key: str,
    payload: object | None = None,
) -> object:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "resolution=merge-duplicates,return=minimal",
            "Accept-Profile": "api",
            "Content-Profile": "api",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Supabase rechazó la operación administrativa ({error.code})") from error


def bootstrap(
    supabase_url: str,
    service_key: str,
    email: str,
    display_name: str,
    credentials_file: Path,
) -> dict[str, object]:
    if credentials_file.exists():
        raise FileExistsError(f"Ya existe el archivo protegido: {credentials_file}")

    password = secrets.token_urlsafe(32)
    user = api_request(
        "POST",
        f"{supabase_url.rstrip('/')}/auth/v1/admin/users",
        service_key,
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"display_name": display_name},
        },
    )
    user_id = str(user["id"])
    write_credentials(credentials_file, email, password)

    encoded_id = urllib.parse.quote(user_id, safe="")
    api_request(
        "PATCH",
        f"{supabase_url.rstrip('/')}/rest/v1/t_perfiles?f_uuid=eq.{encoded_id}",
        service_key,
        {"f_nombre_mostrar": display_name, "f_rol": "administrator", "f_activo": True},
    )
    branches = api_request(
        "GET",
        f"{supabase_url.rstrip('/')}/rest/v1/t_sucursales?select=f_uuid,f_idsucursal",
        service_key,
    )
    memberships = [{"f_uuid_perfil": user_id, "f_uuid_sucursal": branch["f_uuid"], "f_idsucursal": branch["f_idsucursal"]} for branch in branches]
    api_request(
        "POST",
        f"{supabase_url.rstrip('/')}/rest/v1/t_membresias_sucursales?on_conflict=f_uuid_perfil,f_uuid_sucursal",
        service_key,
        memberships,
    )
    return safe_report(email, credentials_file, password)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env.local"))
    parser.add_argument("--email", default="admin@farmacialalinea.local")
    parser.add_argument("--display-name", default="Abel Medrano")
    parser.add_argument("--credentials-file", type=Path, default=Path("/root/procontra-admin-credentials.txt"))
    args = parser.parse_args()

    environment = load_environment(args.env_file)
    report = bootstrap(
        environment["SUPABASE_URL"],
        environment["SUPABASE_SERVICE_ROLE_KEY"],
        args.email.strip().lower(),
        args.display_name.strip(),
        args.credentials_file,
    )
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
