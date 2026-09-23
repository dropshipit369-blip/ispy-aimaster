/** Normalises a scanned barcode to digits and checks its GS1 check digit (UPC-A, EAN-8/13, ISBN-13, GTIN-14). */
export function normaliseGtin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s-]/g, "");
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return null;
  const body = digits.slice(0, -1).split("").reverse().map(Number);
  const sum = body.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1)) ? digits : null;
}
