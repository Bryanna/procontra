import { chromium } from "playwright";

const appUrl = process.env.APP_URL;
const email = process.env.LOGIN_EMAIL;
const password = process.env.LOGIN_PASSWORD;

if (!appUrl || !email || !password) {
  throw new Error("APP_URL, LOGIN_EMAIL and LOGIN_PASSWORD are required");
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground, background) {
  const first = 0.2126 * channel(foreground[0]) + 0.7152 * channel(foreground[1]) + 0.0722 * channel(foreground[2]);
  const second = 0.2126 * channel(background[0]) + 0.7152 * channel(background[1]) + 0.0722 * channel(background[2]);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
await context.addInitScript(() => localStorage.setItem("procontra-theme", "dark"));
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

await page.goto(`${appUrl}/ingresar`, { waitUntil: "networkidle" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await Promise.all([
  page.waitForURL((url) => !url.pathname.includes("ingresar")),
  page.locator('button[type="submit"]').click(),
]);
await page.waitForLoadState("networkidle");

const audit = await page.evaluate(() => {
  function rgb(value) {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? match.slice(1, 4).map(Number) : null;
  }

  function backgroundFor(element) {
    let current = element;
    while (current) {
      const value = getComputedStyle(current).backgroundColor;
      if (value !== "rgba(0, 0, 0, 0)" && value !== "transparent") return rgb(value);
      current = current.parentElement;
    }
    return null;
  }

  const contrastSelectors = [
    ".metric-label",
    ".metric-value",
    ".metric-change",
    ".notice-title",
    ".notice-card p:not(.notice-title)",
    ".priority-row:not(.priority-header)",
    ".continuity-legend",
    ".stock-copy span",
    ".activity-list span",
  ];
  const surfaceSelectors = [
    ".priority-header",
    ".stock-item button",
    ".notice-icon",
    ".stock-track",
  ];

  return {
    theme: document.documentElement.dataset.theme,
    contrasts: contrastSelectors.map((selector) => {
      const element = document.querySelector(selector);
      const styles = element ? getComputedStyle(element) : null;
      return {
        selector,
        foreground: styles ? rgb(styles.color) : null,
        background: element ? backgroundFor(element) : null,
      };
    }),
    surfaces: surfaceSelectors.map((selector) => {
      const element = document.querySelector(selector);
      return {
        selector,
        background: element ? backgroundFor(element) : null,
      };
    }),
  };
});

const contrastResults = audit.contrasts.map((item) => ({
  ...item,
  ratio: item.foreground && item.background ? contrast(item.foreground, item.background) : 0,
}));
const lowContrast = contrastResults.filter((item) => item.ratio < 4.5);
const lightSurfaces = audit.surfaces.filter((item) => item.background && item.background.every((channelValue) => channelValue > 220));
const report = {
  theme: audit.theme,
  contrastResults: contrastResults.map((item) => ({ selector: item.selector, ratio: Number(item.ratio.toFixed(2)) })),
  lightSurfaces: lightSurfaces.map((item) => item.selector),
  runtimeErrors,
};

console.log(JSON.stringify(report, null, 2));
await browser.close();

if (audit.theme !== "dark" || lowContrast.length || lightSurfaces.length || runtimeErrors.length) {
  process.exit(1);
}
