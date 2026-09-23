const ignoredHeaders = /^(FACTURA|RNC|NCF|FECHA|CLIENTE|TOTAL|SUBTOTAL|ITBIS|DESCUENTO|FORMA DE PAGO|TEL[EÉ]FONO|DIRECCI[OÓ]N)\b/i;

export function extractProductLineSuggestions(rawText: string) {
  return rawText.split(/\r?\n/).map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 4 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value) && !ignoredHeaders.test(value))
    .slice(0, 50).map((description) => ({ description, code: "", barcode: "", quantity: "", unit: "", unitCost: "", lot: "", expiryDate: "" }));
}
