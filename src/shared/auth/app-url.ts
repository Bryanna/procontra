type Environment = Record<string, string | undefined>;

export function appUrl(path: string, environment: Environment = process.env): URL {
  const configured = environment.APP_URL?.trim();
  if (!configured) throw new Error("Falta la variable APP_URL");

  let origin: URL;
  try {
    origin = new URL(configured);
  } catch {
    throw new Error("APP_URL debe ser una URL http(s)");
  }
  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    throw new Error("APP_URL debe ser una URL http(s)");
  }
  return new URL(path, origin);
}
