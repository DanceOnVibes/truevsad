/**
 * Converting non-pound adverts at the European Central Bank's daily reference rate,
 * via Frankfurter (free, no key). We send only the currency codes, nothing about the family.
 * If no rate is available we refuse rather than guess.
 */

export const SUPPORTED_CURRENCIES = ["GBP", "EUR", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const SYMBOL: Record<SupportedCurrency, string> = { GBP: "£", EUR: "€", USD: "$" };

export function currencySymbol(c: string): string {
  return SYMBOL[c as SupportedCurrency] ?? `${c} `;
}

const cache = new Map<string, { at: number; rate: number; date: string }>();

/** GBP per 1 unit of `from`, with the ECB date it applies to. Cached for 6 hours. */
export async function rateToGBP(from: SupportedCurrency): Promise<{ rate: number; date: string } | null> {
  if (from === "GBP") return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  const hit = cache.get(from);
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit;
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=GBP`, {
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { date?: string; rates?: { GBP?: number } };
    const rate = Number(data.rates?.GBP);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 10) return null;
    const value = { at: Date.now(), rate, date: String(data.date ?? "") };
    cache.set(from, value);
    return value;
  } catch {
    return null;
  }
}

/** A non-pound advert converted to pounds. Kept with the quote so shared receipts can say so. */
export interface Conversion {
  from: Exclude<SupportedCurrency, "GBP">;
  /** The advertised headline in the advert's minor units (cents). */
  amountMinor: number;
  /** Pounds per 1 unit of `from`. */
  rate: number;
  /** ECB reference date, YYYY-MM-DD. */
  date: string;
}

export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
}

/** Plain fact, shown on the receipt: what the advert said, the rate, and where the rate came from. */
export function conversionNote(c: Conversion): string {
  const day = new Date(`${c.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
  return (
    `Advertised as ${formatMoney(c.amountMinor, c.from)}. Converted to pounds at ` +
    `${currencySymbol(c.from)}1 = £${c.rate.toFixed(4)}, the European Central Bank rate for ${day}. ` +
    `Your card or bank may use a different rate.`
  );
}

export function isSupportedCurrency(c: string): c is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
}

/**
 * Turn the advertised headline into pence. Returns an error message (string) rather than
 * guessing when the currency isn't supported or no rate is available.
 */
export async function toPence<T extends { headlinePence: number; currency: string }>(
  offer: T,
): Promise<{ offer: T; conversion?: Conversion } | string> {
  const cur = offer.currency.toUpperCase();
  if (cur === "GBP") return { offer: { ...offer, currency: "GBP" } };
  if (!isSupportedCurrency(cur)) {
    return "We can price deals in pounds, euros or US dollars. Choose one of those, or convert the price yourself.";
  }
  const fx = await rateToGBP(cur);
  if (!fx) {
    return "We couldn't get today's exchange rate, so we haven't priced this. Try again in a minute, or enter the price in pounds.";
  }
  const conversion: Conversion = { from: cur as Conversion["from"], amountMinor: offer.headlinePence, rate: fx.rate, date: fx.date };
  return { offer: { ...offer, headlinePence: Math.round(offer.headlinePence * fx.rate), currency: "GBP" }, conversion };
}
