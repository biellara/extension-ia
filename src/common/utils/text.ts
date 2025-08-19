export function normalizeText(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function onlyDigits(s: string): string {
  return (s.match(/\d+/g)?.join("") ?? "");
}
