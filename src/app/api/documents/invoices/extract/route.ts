import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { extractProductLineSuggestions } from "@/modules/documents/invoice-ocr";
import { requireDocumentWrite } from "../../document-api";
const run = promisify(execFile);

export async function POST(request: Request) {
  const auth = await requireDocumentWrite(); if ("response" in auth) return auth.response;
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size < 1 || file.size > 10*1024*1024)
    return NextResponse.json({ error: "Adjunte una imagen válida de hasta 10 MB" }, { status: 400 });
  const dir = await mkdtemp(join(tmpdir(), "procontra-ocr-")); const input = join(dir, "invoice-image");
  try {
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    const { stdout } = await run("tesseract", [input, "stdout", "-l", "spa+eng", "--psm", "6"], { timeout: 30000, maxBuffer: 2*1024*1024 });
    return NextResponse.json({ rawText: stdout, lines: extractProductLineSuggestions(stdout) });
  } catch { return NextResponse.json({ error: "No fue posible extraer el texto; complete los renglones manualmente" }, { status: 422 }); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
