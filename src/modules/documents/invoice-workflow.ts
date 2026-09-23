export type InvoiceSource = "web" | "whatsapp";
export type InvoiceDocumentType = "purchase" | "dispensation";
export type InvoiceLineStatus = "matched" | "ambiguous" | "product_missing";

export interface InvoiceLineInput {
  description: string;
  code?: string;
  barcode?: string;
  quantity: number;
  unit?: string;
  unitCost?: number | null;
  lot?: string;
  expiryDate?: string;
}

export interface ProductMatchCandidate {
  id: string;
  code: string;
  barcode?: string;
  name: string;
}

export interface InvoiceSubmission {
  source: InvoiceSource;
  documentType: InvoiceDocumentType;
  hash: string;
  storagePath: string;
  branchId: string;
  reference?: string;
  channelIdentifier?: string;
  lines: InvoiceLineInput[];
}

export const normalizeProductText = (value: unknown) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

export function matchInvoiceLines(lines: InvoiceLineInput[], products: ProductMatchCandidate[]) {
  return lines.map((line) => {
    const code = normalizeProductText(line.code);
    const barcode = String(line.barcode ?? "").replace(/\D/g, "");
    const name = normalizeProductText(line.description);
    const candidates = products.filter((product) =>
      (code && normalizeProductText(product.code) === code)
      || (barcode && String(product.barcode ?? "").replace(/\D/g, "") === barcode)
      || (!code && !barcode && normalizeProductText(product.name) === name));
    return {
      ...line,
      status: candidates.length === 1 ? "matched" as const : candidates.length > 1 ? "ambiguous" as const : "product_missing" as const,
      productId: candidates.length === 1 ? candidates[0].id : null,
      candidates: candidates.map((candidate) => candidate.id),
    };
  });
}

export function prepareInvoiceSubmission(value: InvoiceSubmission): InvoiceSubmission {
  if (!/^[a-f0-9]{64}$/i.test(String(value.hash ?? ""))) throw new Error("Hash de imagen requerido");
  if (!value.storagePath?.startsWith("private/")) throw new Error("Ruta privada requerida");
  if (!value.branchId) throw new Error("Sucursal requerida");
  if (!Array.isArray(value.lines) || value.lines.length === 0) throw new Error("Renglones de factura requeridos");
  const lines = value.lines.map((line) => {
    const description = String(line.description ?? "").trim();
    const quantity = Number(line.quantity);
    if (!description) throw new Error("Descripción de producto requerida");
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Cantidad inválida");
    return { ...line, description, quantity };
  });
  return { ...value, lines };
}
