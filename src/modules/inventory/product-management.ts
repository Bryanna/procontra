export interface ProductStockInput {
  branchId: string;
  onHand: number;
  reorderMinimum: number;
  lot: string;
  expiryDate: string;
  cost: number | null;
  price: number | null;
}

export interface ProductCreateInput {
  code: string;
  name: string;
  presentation: string | null;
  barcode: string | null;
  activeIngredientId: string;
  manufacturerId: string;
  categoryId: string;
  unitOfMeasureId: string;
  dosageFormId: string;
  administrationRouteId: string;
  sanitaryRegistration: string | null;
  prescriptionRequired: boolean;
  positions: ProductStockInput[];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nonNegativeNumber(value: unknown, message: string): number {
  const parsed = typeof value === "number" ? value : Number(text(value));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(message);
  return parsed;
}

function optionalNonNegativeNumber(value: unknown, message: string): number | null {
  if (value === null || value === undefined || text(value) === "") return null;
  return nonNegativeNumber(value, message);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function prepareProductCreate(
  raw: unknown,
  allowedBranchIds: string[],
  now = new Date(),
): ProductCreateInput {
  const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const code = text(input.code);
  const name = text(input.name);
  const presentation = text(input.presentation);
  const barcode = text(input.barcode);
  const activeIngredientId = text(input.activeIngredientId);
  const manufacturerId = text(input.manufacturerId);
  const categoryId = text(input.categoryId);
  const unitOfMeasureId = text(input.unitOfMeasureId);
  const dosageFormId = text(input.dosageFormId);
  const administrationRouteId = text(input.administrationRouteId);
  const sanitaryRegistration = text(input.sanitaryRegistration);
  const prescriptionRequired = input.prescriptionRequired === true;
  if (!code || code.length > 60) throw new Error("Código de producto inválido");
  if (name.length < 2 || name.length > 240) throw new Error("Nombre de producto inválido");
  if (presentation.length > 160) throw new Error("Presentación de producto inválida");
  if (barcode && (!/^\d{8,14}$/.test(barcode))) throw new Error("Código de barras inválido");
  if (!uuidPattern.test(categoryId)) throw new Error("Categoría inválida");
  if (!uuidPattern.test(manufacturerId)) throw new Error("Fabricante inválido");
  if (!uuidPattern.test(activeIngredientId)) throw new Error("Principio activo inválido");
  if (!uuidPattern.test(unitOfMeasureId)) throw new Error("Unidad de medida inválida");
  if (!uuidPattern.test(dosageFormId)) throw new Error("Forma farmacéutica inválida");
  if (!uuidPattern.test(administrationRouteId)) throw new Error("Vía de administración inválida");
  if (sanitaryRegistration.length > 100) throw new Error("Registro sanitario inválido");

  const rawPositions = input.positions === undefined ? [] : input.positions;
  if (!Array.isArray(rawPositions) || rawPositions.length > allowedBranchIds.length) {
    throw new Error("Posiciones de inventario inválidas");
  }
  const seen = new Set<string>();
  const today = now.toISOString().slice(0, 10);
  const positions = rawPositions.map((rawPosition) => {
    const position = rawPosition && typeof rawPosition === "object"
      ? rawPosition as Record<string, unknown>
      : {};
    const branchId = text(position.branchId);
    if (!allowedBranchIds.includes(branchId) || seen.has(branchId)) {
      throw new Error("Sucursal de inventario inválida");
    }
    seen.add(branchId);
    const onHand = nonNegativeNumber(position.onHand, "Existencia inicial inválida");
    const reorderMinimum = nonNegativeNumber(position.reorderMinimum, "Mínimo de reposición inválido");
    const lot = text(position.lot);
    if (!lot || lot.length > 100) throw new Error("Lote de inventario inválido");
    const expiryDate = text(position.expiryDate);
    if (!validDate(expiryDate) || expiryDate < today) throw new Error("Vencimiento de inventario inválido");
    const cost = optionalNonNegativeNumber(position.cost, "Costo de inventario inválido");
    const price = optionalNonNegativeNumber(position.price, "Precio de inventario inválido");
    return { branchId, onHand, reorderMinimum, lot, expiryDate, cost, price };
  });

  return {
    code,
    name: name.toLocaleUpperCase("es"),
    presentation: presentation ? presentation.toLocaleUpperCase("es") : null,
    barcode: barcode || null,
    activeIngredientId,
    manufacturerId,
    categoryId,
    unitOfMeasureId,
    dosageFormId,
    administrationRouteId,
    sanitaryRegistration: sanitaryRegistration ? sanitaryRegistration.toLocaleUpperCase("es") : null,
    prescriptionRequired,
    positions,
  };
}
