export function digitsOnly(value: unknown, maximumLength?: number) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return typeof maximumLength === "number" ? digits.slice(0, maximumLength) : digits;
}

export function formatPhoneNumber(value: unknown) {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
