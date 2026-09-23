export type ProcontraTheme = "light" | "dark";

export const themeStorageKey = "procontra-theme";

export function applyThemeBeforePaint(
  root: HTMLElement,
  storage: Pick<Storage, "getItem">,
  prefersDark: boolean,
): ProcontraTheme {
  let saved: string | null = null;

  try {
    saved = storage.getItem(themeStorageKey);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }

  const theme: ProcontraTheme = saved === "dark" || saved === "light"
    ? saved
    : prefersDark
      ? "dark"
      : "light";

  root.dataset.theme = theme;
  return theme;
}

export const themeBootScript = `(()=>{try{const s=localStorage.getItem("${themeStorageKey}");const d=s==="dark"||s==="light"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=d}catch{document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}})()`;
