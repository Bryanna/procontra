export const INVENTORY_IMPORT_HEADERS = [
  "CODIGO",
  "PRODUCTO",
  "SUCURSAL",
  "EXISTENCIA",
  "INVENTARIO_MINIMO",
  "LOTE",
  "VENCIMIENTO",
  "COSTO",
  "PRECIO",
  "ACTUALIZADO_EN",
] as const;

export type InventoryImportHeader = (typeof INVENTORY_IMPORT_HEADERS)[number];
export type InventoryImportRow = Record<InventoryImportHeader, string>;

export interface InventoryPosition {
  productCode: string;
  productName: string;
  branchCode: "70" | "01" | "81" | "48";
  onHand: number;
  reserved: number;
  available: number;
  reorderMinimum: number;
  lot: string;
  expiryDate: string;
  cost: number;
  price: number;
  updatedAt: string;
}

export interface RejectedInventoryRow {
  rowNumber: number;
  row: InventoryImportRow;
  errors: string[];
}

export interface InventoryImportResult {
  accepted: InventoryPosition[];
  rejected: RejectedInventoryRow[];
}

const BRANCH_CODES = new Set(["70", "01", "81", "48"]);
const INTEGER_PATTERN = /^\d+$/;
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateInventoryImport(
  rows: InventoryImportRow[],
  catalogCodes: Set<string>,
): InventoryImportResult {
  const accepted: InventoryPosition[] = [];
  const rejected: RejectedInventoryRow[] = [];
  const seenPositions = new Set<string>();

  rows.forEach((sourceRow, index) => {
    const row = Object.fromEntries(
      INVENTORY_IMPORT_HEADERS.map((header) => [header, String(sourceRow[header] ?? "").trim()]),
    ) as InventoryImportRow;
    const errors: string[] = [];

    for (const header of INVENTORY_IMPORT_HEADERS) {
      if (!row[header]) errors.push(`${header} es obligatorio`);
    }

    if (row.CODIGO && !catalogCodes.has(row.CODIGO)) {
      errors.push("Producto no existe en el catálogo maestro");
    }
    if (row.SUCURSAL && !BRANCH_CODES.has(row.SUCURSAL)) {
      errors.push("Sucursal no válida");
    }
    if (row.EXISTENCIA && !INTEGER_PATTERN.test(row.EXISTENCIA)) {
      errors.push("EXISTENCIA debe ser un entero mayor o igual a cero");
    }
    if (row.INVENTARIO_MINIMO && !INTEGER_PATTERN.test(row.INVENTARIO_MINIMO)) {
      errors.push("INVENTARIO_MINIMO debe ser un entero mayor o igual a cero");
    }
    if (row.COSTO && !DECIMAL_PATTERN.test(row.COSTO)) {
      errors.push("COSTO debe ser un número mayor o igual a cero");
    }
    if (row.PRECIO && !DECIMAL_PATTERN.test(row.PRECIO)) {
      errors.push("PRECIO debe ser un número mayor o igual a cero");
    }
    if (row.VENCIMIENTO && !isValidDate(row.VENCIMIENTO)) {
      errors.push("VENCIMIENTO debe usar el formato AAAA-MM-DD");
    }
    if (row.ACTUALIZADO_EN && Number.isNaN(Date.parse(row.ACTUALIZADO_EN))) {
      errors.push("ACTUALIZADO_EN debe ser una fecha y hora válida");
    }

    const positionKey = `${row.CODIGO}|${row.SUCURSAL}|${row.LOTE}`;
    if (seenPositions.has(positionKey)) {
      errors.push("Posición duplicada para producto, sucursal y lote");
    }
    seenPositions.add(positionKey);

    if (errors.length > 0) {
      rejected.push({ rowNumber: index + 2, row, errors: [...new Set(errors)] });
      return;
    }

    const onHand = Number(row.EXISTENCIA);
    accepted.push({
      productCode: row.CODIGO,
      productName: row.PRODUCTO,
      branchCode: row.SUCURSAL as InventoryPosition["branchCode"],
      onHand,
      reserved: 0,
      available: onHand,
      reorderMinimum: Number(row.INVENTARIO_MINIMO),
      lot: row.LOTE,
      expiryDate: row.VENCIMIENTO,
      cost: Number(row.COSTO),
      price: Number(row.PRECIO),
      updatedAt: row.ACTUALIZADO_EN,
    });
  });

  return { accepted, rejected };
}
