import { chromium } from "playwright";

const url = process.env.PROCONTRA_URL ?? "https://93.127.215.188/ingresar";
const browser = await chromium.launch({ headless: true });
const origin = new URL(url).origin;
const context = await browser.newContext({
  storageState: {
    cookies: [],
    origins: [{
      origin,
      localStorage: [{ name: "procontra-theme", value: "dark" }],
    }],
  },
});
const page = await context.newPage();

try {
  await page.addInitScript(() => {
    window.__themeProbe = { mutations: [], frames: [], paints: [] };
    new PerformanceObserver((list) => {
      const root = document.documentElement;
      for (const entry of list.getEntries()) {
        window.__themeProbe.paints.push({
          name: entry.name,
          theme: root?.dataset.theme ?? null,
          background: root ? getComputedStyle(root).background : null,
        });
      }
    }).observe({ type: "paint", buffered: true });
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.target === document.documentElement) {
          window.__themeProbe.mutations.push(document.documentElement.dataset.theme ?? null);
        }
      }
    });
    observer.observe(document, {
      attributes: true,
      attributeFilter: ["data-theme"],
      childList: true,
      subtree: true,
    });

    let remaining = 20;
    const sample = () => {
      const root = document.documentElement;
      if (root) {
        window.__themeProbe.frames.push({
          theme: root.dataset.theme ?? null,
          background: getComputedStyle(root).background,
        });
        remaining -= 1;
      }
      if (remaining > 0) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => ({
    ...window.__themeProbe,
    finalTheme: document.documentElement.dataset.theme,
    finalBackground: getComputedStyle(document.documentElement).background,
  }));

  if (!result.frames || result.frames.length === 0) {
    throw new Error("The dark-refresh probe did not capture any animation frames.");
  }

  const lightMutations = result.mutations.filter((value) => value === "light");
  const paintedWithoutDarkTheme = result.frames.filter((frame) => frame.theme !== "dark");
  const actualPaintWithoutDarkTheme = result.paints.filter((paint) => paint.theme !== "dark");

  console.log(JSON.stringify(result, null, 2));

  if (
    result.finalTheme !== "dark"
    || lightMutations.length > 0
    || paintedWithoutDarkTheme.length > 0
    || result.paints.length === 0
    || actualPaintWithoutDarkTheme.length > 0
  ) {
    throw new Error("Dark theme was not stable from the first animation frame after refresh.");
  }
} finally {
  await browser.close();
}
