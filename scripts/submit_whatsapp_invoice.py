#!/usr/bin/env python3
"""Submit a WhatsApp invoice image after visible-line extraction."""
import argparse, json, mimetypes, os, pathlib, secrets, urllib.error, urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--image", required=True)
parser.add_argument("--sender", required=True)
branch = parser.add_mutually_exclusive_group(required=True)
branch.add_argument("--branch-id")
branch.add_argument("--branch-code")
parser.add_argument("--type", choices=("purchase", "dispensation"), required=True)
parser.add_argument("--reference", default="")
parser.add_argument("--lines-json", required=True, help="JSON array or @/path/to/file.json")
parser.add_argument("--url", default="http://127.0.0.1:3001/api/documents/invoices/channel")
args = parser.parse_args()
key = os.environ.get("PROCONTRA_CHANNEL_KEY", "")
if not key:
    key_path = pathlib.Path(__file__).resolve().parents[1] / ".procontra_channel_key"
    if key_path.exists():
        key = key_path.read_text().strip()
if len(key) < 32:
    raise SystemExit("PROCONTRA_CHANNEL_KEY no configurada")
image = pathlib.Path(args.image)
if not image.is_file():
    raise SystemExit("Imagen no encontrada")
raw_lines = pathlib.Path(args.lines_json[1:]).read_text() if args.lines_json.startswith("@") else args.lines_json
lines = json.loads(raw_lines)
metadata = json.dumps({"documentType": args.type, "branchId": args.branch_id, "branchCode": args.branch_code, "reference": args.reference, "lines": lines}, ensure_ascii=False)
boundary = "----procontra" + secrets.token_hex(12)
parts = []
def field(name, value):
    parts.extend([f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()])
field("sender", args.sender); field("metadata", metadata)
mime = mimetypes.guess_type(image.name)[0] or "image/jpeg"
parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{image.name}\"\r\nContent-Type: {mime}\r\n\r\n".encode())
parts.append(image.read_bytes()); parts.append(b"\r\n"); parts.append(f"--{boundary}--\r\n".encode())
request = urllib.request.Request(args.url, data=b"".join(parts), method="POST", headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "x-procontra-channel-key": key})
try:
    with urllib.request.urlopen(request, timeout=60) as response:
        print(response.read().decode())
except urllib.error.HTTPError as error:
    detail = error.read().decode(errors="replace")
    raise SystemExit(f"HTTP {error.code}: {detail}") from error
