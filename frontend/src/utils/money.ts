export function fromCents(cents: number): string {
  return (Number(cents) / 100).toFixed(2);
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}
