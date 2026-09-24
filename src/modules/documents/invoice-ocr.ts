const ignoredHeaders = /^(FACTURA|RNC|NCF|FECHA|CLIENTE|TOTAL|SUBTOTAL|ITBIS|DESCUENTO|FORMA DE PAGO|TEL[EÉ]FONO|DIRECCI[OÓ]N)\b/i;

function cleanLines(rawText: string) {
  return rawText.split(/\r?\n/).map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function labeledValue(lines: string[], label: RegExp) {
  const line = lines.find((value) => label.test(value));
  return line?.replace(label, "").replace(/^\s*[:#-]?\s*/, "").trim() ?? "";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export interface InsuranceAuthorizationSuggestion {
  insurerCode: string;
  insurerName: string;
  patientName: string;
  governmentId: string;
  insuranceCard: string;
  phone: string;
  authorizationNumber: string;
  authorizationDate: string;
  prescriber: string;
  authorized: boolean;
  continuousUse: boolean;
  medicines: Array<{ medicine: string; quantity: string }>;
}

export function extractInsuranceAuthorizationSuggestion(rawText: string): InsuranceAuthorizationSuggestion {
  const lines = cleanLines(rawText);
  const insurerName = lines.find((value) => /\bARS\b/i.test(value))?.toUpperCase() ?? "";
  const normalizedInsurer = insurerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const insurerCode = normalizedInsurer.includes("primera") ? "primera" : "";
  const authorizationStart = lines.findIndex((value) => /^AUTORIZADO\b/i.test(value));
  const authorizationEnd = lines.findIndex((value, index) => index > authorizationStart && /^AUTORIZACI[OÓ]N\s*:/i.test(value));
  const medicineLines = authorizationStart >= 0
    ? lines.slice(authorizationStart + 1, authorizationEnd > authorizationStart ? authorizationEnd : lines.length)
    : [];

  return {
    insurerCode,
    insurerName,
    patientName: labeledValue(lines, /^NOMBRE\s+(?:DEL\s+)?AFILIADO\b/i),
    governmentId: onlyDigits(labeledValue(lines, /^C[EÉ]DULA\s+(?:DEL\s+)?AFILIADO\b/i)),
    insuranceCard: onlyDigits(labeledValue(lines, /^(?:CARN[EÉ]|CARNET)\s+(?:DEL\s+)?AFILIADO\b/i)),
    phone: onlyDigits(labeledValue(lines, /^TEL[EÉ]FONO\s+(?:SUMINISTRADO|DEL\s+AFILIADO)?\b/i)),
    authorizationNumber: labeledValue(lines, /^AUTORIZACI[OÓ]N\b/i),
    authorizationDate: labeledValue(lines, /^FECHA\s+AUTORIZACI[OÓ]N\b/i),
    prescriber: labeledValue(lines, /^PRESCRIPTOR\b/i),
    authorized: /^AUTORIZADO\b/im.test(rawText),
    continuousUse: /USO\s+CONTINUO/i.test(rawText),
    medicines: medicineLines
      .filter((value) => /\b(?:MG|MCG|ML|TAB|CAP|AMP|JARABE|CREMA|DET)\b/i.test(value))
      .slice(0, 50)
      .map((medicine) => ({
        medicine,
        quantity: medicine.match(/\bDET\s+(\d+(?:[.,]\d+)?)\b/i)?.[1]?.replace(",", ".") ?? "",
      })),
  };
}

export function extractProductLineSuggestions(rawText: string) {
  return cleanLines(rawText)
    .filter((value) => value.length >= 4 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value) && !ignoredHeaders.test(value))
    .slice(0, 50).map((description) => ({ description, code: "", barcode: "", quantity: "", unit: "", unitCost: "", lot: "", expiryDate: "" }));
}
