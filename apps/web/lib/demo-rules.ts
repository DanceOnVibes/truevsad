import type { FeeRule } from "@truevsad/true-cost";

/**
 * PLACEHOLDER RULES — NOT REAL-WORLD FIGURES.
 *
 * These exist only so the Deal X-ray flow can be clicked through end to end
 * before the fee_rule table is populated with sourced, dated data.
 * Every rule is flagged `demo: true`, and the UI shows a warning when any are used.
 * Delete this file once rules are loaded from Supabase.
 */
export const DEMO_RULES: FeeRule[] = [
  {
    id: "demo-hold-bag",
    category: "party_extra",
    label: "Hold bag, return (demo)",
    unit: "per_person",
    amount: { kind: "fixed", pence: 6000 },
    minAge: 2,
    confidence: 0.4,
    demo: true,
  },
  {
    id: "demo-seats-together",
    category: "party_extra",
    label: "Seats together, return (demo)",
    unit: "per_person",
    amount: { kind: "fixed", pence: 2400 },
    minAge: 2,
    confidence: 0.3,
    demo: true,
  },
  {
    id: "demo-tourist-tax",
    category: "levy",
    label: "Tourist tax (demo)",
    unit: "per_adult_per_night",
    amount: { kind: "fixed", pence: 250 },
    confidence: 0.3,
    demo: true,
  },
  {
    id: "demo-airport-parking",
    category: "door_to_door",
    label: "Airport parking (demo)",
    unit: "per_party",
    amount: { kind: "fixed", pence: 9000 },
    confidence: 0.2,
    demo: true,
  },
];
