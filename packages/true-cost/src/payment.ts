/**
 * Paying a deal priced in euros or dollars with a UK card.
 *
 * Shown as "Good to know" on the receipt. Never added to the true price: what you pay depends on
 * your own card, and several UK cards charge nothing. Rates are from each bank's own tariff page.
 */
export interface CardFee {
  provider: string;
  /** Non-sterling transaction fee on a standard card, in basis points (2.99% = 299). */
  bp: number;
  card: "debit" | "credit";
  sourceUrl: string;
}

export const CARD_FEES: CardFee[] = [
  { provider: "Barclays", card: "debit", bp: 299, sourceUrl: "https://www.barclays.co.uk/content/dam/documents/personal/current-accounts/using-your-debit-card-abroad.PDF" },
  { provider: "HSBC UK", card: "debit", bp: 275, sourceUrl: "https://hsbc.co.uk/international/using-your-card-abroad-fees-and-charges-explained" },
  { provider: "Lloyds", card: "debit", bp: 299, sourceUrl: "https://www.lloydsbank.com/travel/debit-card-abroad.html" },
  { provider: "NatWest", card: "debit", bp: 275, sourceUrl: "https://www.natwest.com/life-moments/travel/spending-abroad.html" },
  { provider: "Santander UK", card: "debit", bp: 295, sourceUrl: "https://www.santander.co.uk/personal/support/credit-cards/travelling" },
  { provider: "Nationwide", card: "debit", bp: 299, sourceUrl: "https://www.nationwide.co.uk/help/travel/charges-using-your-card-abroad" },
  { provider: "Halifax", card: "debit", bp: 299, sourceUrl: "https://www.halifax.co.uk/travel/using-debit-credit-cards-abroad/using-your-debit-card-abroad.html" },
];

/** Cards whose own pages say they charge no fee for paying in another currency. */
export const NO_FEE_CARDS = [
  { provider: "Monzo", sourceUrl: "https://monzo.com/help/travelling/understanding-fees" },
  { provider: "Starling", sourceUrl: "https://www.starlingbank.com/travel/" },
  { provider: "Chase UK", sourceUrl: "https://www.chase.co.uk/gb/en/support/travel-with-chase/" },
];

export const SURCHARGE_BAN_URL = "https://www.legislation.gov.uk/uksi/2012/3110/regulation/6A";
export const CARD_FEES_CHECKED_ON = "2026-11-01";

export interface CardFeeNote {
  lowPence: number;
  highPence: number;
  lowPercent: string;
  highPercent: string;
}

/** What a standard UK debit card's non-sterling fee would add to this price, or null for pounds. */
export function cardFeeNote(currency: string | undefined | null, pricePence: number): CardFeeNote | null {
  if (!currency || currency === "GBP" || pricePence <= 0) return null;
  const bps = CARD_FEES.map((f) => f.bp);
  const lo = Math.min(...bps);
  const hi = Math.max(...bps);
  return {
    lowPence: Math.round((pricePence * lo) / 10_000),
    highPence: Math.round((pricePence * hi) / 10_000),
    lowPercent: `${(lo / 100).toFixed(2)}%`,
    highPercent: `${(hi / 100).toFixed(2)}%`,
  };
}
