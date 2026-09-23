import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.APP_URL || "https://93.127.215.188";
const credentialsPath = process.env.CREDENTIALS_FILE || "/root/procontra-admin-credentials.txt";
const credentialText = await readFile(credentialsPath, "utf8");
const email = credentialText.match(/^Email:\s*(.+)$/m)?.[1]?.trim();
const password = credentialText.match(/^Password:\s*(.+)$/m)?.[1]?.trim();
if (!email || !password) throw new Error("No se pudieron cargar las credenciales protegidas");

const artifactDir = new URL("../artifacts/inventory-workspace/", import.meta.url).pathname;
await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function inspect(name, viewport, theme = "light") {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const badResponses = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });

  await page.goto(`${baseUrl}/ingresar`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("ingresar")),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.evaluate((selectedTheme) => localStorage.setItem("procontra-theme", selectedTheme), theme);
  await page.goto(`${baseUrl}/inventario`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Consulta de productos" }).waitFor();

  const branchHeaders = await page.locator('[role="columnheader"]').allTextContents();
  const productRows = await page.locator('.inventory-live-row:not(.inventory-live-header)').count();
  const totalText = await page.locator('.catalog-result-count').innerText();
  const noDataCount = await page.getByText("Sin dato", { exact: true }).count();
  const filterControls = await page.locator('.inventory-query-form select').count();
  const templateLinks = await page.getByRole("link", { name: /Descargar plantilla/ }).count();
  const initiallyVisibleSummaryCards = await page.locator('.inventory-optional-sections .module-metric-card').count();
  const hasHorizontalOverflow = await page.locator('.inventory-live-table').evaluate((element) => element.scrollWidth > element.clientWidth);
  const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await page.screenshot({ path: `${artifactDir}/${name}.png`, fullPage: true });

  if (name === "desktop") {
    const searchBox = page.getByRole("searchbox", { name: "Buscar producto" });
    const searchAutocomplete = await searchBox.getAttribute("autocomplete");
    const historyBeforeSearch = await page.evaluate(() => history.length);
    await searchBox.fill("123EKR");
    await page.waitForURL((url) => url.pathname === "/inventario" && url.searchParams.get("q") === "123EKR");
    await page.locator('.inventory-live-row:not(.inventory-live-header)').first().waitFor();
    const historyAfterSearch = await page.evaluate(() => history.length);
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await page.waitForURL((url) => url.pathname === "/inventario" && url.search === "");
    await page.getByRole("button", { name: "Mostrar resumen y herramientas" }).click();
    const revealedSummaryCards = await page.locator('.inventory-optional-sections .module-metric-card').count();
    const revealedTools = await page.locator('.inventory-optional-sections .inventory-tool-card').count();
    await page.getByRole("button", { name: "Gestionar catálogos" }).click();
    await page.getByRole("dialog", { name: "Nuevo registro de catálogo" }).waitFor();
    const maintenanceOptions = await page.getByLabel("Tipo de catálogo").locator("option").count();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.getByRole("button", { name: "Ocultar resumen y herramientas" }).click();
    await page.getByRole("button", { name: "Agregar nuevo producto" }).click();
    await page.getByRole("dialog", { name: "Agregar nuevo producto" }).waitFor();
    const modalBranches = await page.locator('.product-branch-card').count();
    const detailedProductFields = await page.locator('input[name="barcode"],select[name="activeIngredientId"],select[name="manufacturerId"],select[name="categoryId"],select[name="unitOfMeasureId"],select[name="dosageFormId"],select[name="administrationRouteId"],input[name="sanitaryRegistration"],input[name="prescriptionRequired"]').count();
    await page.screenshot({ path: `${artifactDir}/desktop-product-dialog.png`, fullPage: true });
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();

    await page.goto(`${baseUrl}/inventario?status=without_data`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Consulta de productos" }).waitFor();
    const filteredRows = await page.locator('.inventory-live-row:not(.inventory-live-header)').count();
    await page.goto(`${baseUrl}/inventario?status=with_stock`, { waitUntil: "networkidle" });
    const emptyStockState = await page.getByText("No encontramos productos").isVisible();
    results.push({ name, theme, branchHeaders, productRows, totalText, noDataCount, filterControls, templateLinks, initiallyVisibleSummaryCards, searchAutocomplete, historyBeforeSearch, historyAfterSearch, revealedSummaryCards, revealedTools, hasHorizontalOverflow, bodyOverflow, modalBranches, detailedProductFields, maintenanceOptions, filteredRows, emptyStockState, consoleErrors, pageErrors, badResponses });
  } else {
    results.push({ name, theme, branchHeaders, productRows, totalText, noDataCount, filterControls, templateLinks, initiallyVisibleSummaryCards, hasHorizontalOverflow, bodyOverflow, consoleErrors, pageErrors, badResponses });
  }
  await context.close();
}

try {
  await inspect("desktop", { width: 1440, height: 1000 });
  await inspect("mobile", { width: 390, height: 844 });
  await inspect("desktop-dark", { width: 1440, height: 1000 }, "dark");
} finally {
  await browser.close();
}

const requiredBranches = ["Amina 01", "Maizal 48", "Esperanza 70", "Jaibón 81"];
const passed = results.every((result) =>
  requiredBranches.every((branch) => result.branchHeaders.some((header) => header.includes(branch))) &&
  result.productRows > 0 && result.noDataCount > 0 && result.filterControls === 2 && result.templateLinks === 0 && result.initiallyVisibleSummaryCards === 0 && !result.bodyOverflow &&
  result.consoleErrors.length === 0 && result.pageErrors.length === 0 && result.badResponses.length === 0
) && results.find((result) => result.name === "desktop")?.modalBranches === 4 && results.find((result) => result.name === "desktop")?.detailedProductFields === 9 && results.find((result) => result.name === "desktop")?.maintenanceOptions === 6 && results.find((result) => result.name === "desktop")?.searchAutocomplete === "off" && results.find((result) => result.name === "desktop")?.historyBeforeSearch === results.find((result) => result.name === "desktop")?.historyAfterSearch && results.find((result) => result.name === "desktop")?.emptyStockState && results.find((result) => result.name === "desktop")?.revealedSummaryCards === 4 && results.find((result) => result.name === "desktop")?.revealedTools === 8;
console.log(JSON.stringify({ passed, results, artifacts: artifactDir }, null, 2));
if (!passed) process.exitCode = 1;
