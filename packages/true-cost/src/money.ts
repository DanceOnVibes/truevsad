import type { Pence } from "./types";

/** Format pence as "£1,234.56". */
export function formatGBP(pence: Pence): string {
  const sign = pence < 0 ? "−" : "";
  const abs = Math.abs(pence);
  return `${sign}£${(abs / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Round to whole pence (banker's rounding is overkill at this stage). */
export function roundPence(value: number): Pence {
  return Math.round(value);
}
