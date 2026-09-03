export function escapeCsvCell(value: unknown): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}
