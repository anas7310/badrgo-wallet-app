
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function safeCentsAdd(a: number, b: number): number {
  return Math.round(Number(a) + Number(b));
}

export function safeCentsSubtract(a: number, b: number): number {
  return Math.round(Number(a) - Number(b));
}
