import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { extractInsuranceAuthorizationSuggestion, extractProductLineSuggestions } from "@/modules/documents/invoice-ocr";
import { requireDocumentWrite } from "../../document-api";

const run = promisify(execFile);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function runTesseract(path: string) {
  const { stdout } = await run("tesseract", [path, "stdout", "-l", "spa+eng", "--psm", "6"], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  return stdout;
}

export async function POST(request: Request) {
  const auth = await requireDocumentWrite();
  if ("response" in auth) return auth.response;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "Adjunte una imagen o PDF válido de hasta 10 MB" }, { status: 400 });

  const dir = await mkdtemp(join(tmpdir(), "procontra-ocr-"));
  const input = join(dir, file.type === "application/pdf" ? "document.pdf" : "document-image");
  try {
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    let rawText = "";
    if (file.type === "application/pdf") {
      const prefix = join(dir, "page");
      await run("pdftoppm", ["-png", "-r", "150", "-f", "1", "-l", "5", input, prefix], { timeout: 45000, maxBuffer: 1024 * 1024 });
      const pages = (await readdir(dir)).filter((name) => /^page-\d+\.png$/.test(name)).sort();
      for (const page of pages) rawText += `${await runTesseract(join(dir, page))}\n`;
    } else rawText = await runTesseract(input);

    return NextResponse.json({
      rawText,
      lines: extractProductLineSuggestions(rawText),
      authorization: extractInsuranceAuthorizationSuggestion(rawText),
    });
  } catch {
    return NextResponse.json({ error: "No fue posible extraer el texto; complete los datos manualmente" }, { status: 422 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
