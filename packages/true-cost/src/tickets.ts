/**
 * Parking and traffic tickets (PCNs) from Lambeth: which official grounds may apply, and the dates
 * that matter. Every rule here comes from the law or Lambeth's own pages, linked in SOURCES; nothing
 * is a guess about how a council or adjudicator will decide. Checked on TICKETS_CHECKED_ON. When Lambeth's
 * charges or pages change, update this file the same day.
 */

export const TICKETS_CHECKED_ON = "2026-11-24";

export type TicketKind = "street" | "camera_parking" | "moving";

export type TicketSource = { label: string; url: string };

export const TICKET_SOURCES = {
  parkingRegs: {
    label:
      "Civil Enforcement of Parking Contraventions (England) Representations and Appeals Regulations 2007, regulation 4",
    url: "https://www.legislation.gov.uk/uksi/2007/3482/part/2/made",
  },
  cameraRegs: {
    label:
      "Civil Enforcement of Road Traffic Contraventions (Approved Devices, Charging Guidelines and General Provisions) (England) Regulations 2022, regulations 9 and 11",
    url: "https://www.legislation.gov.uk/uksi/2022/71/made",
  },
  movingAct: {
    label: "London Local Authorities and Transport for London Act 2003, Schedule 1, paragraph 1",
    url: "https://www.legislation.gov.uk/ukla/2003/3/schedule/1/enacted",
  },
  guidance: {
    label: "Department for Transport: statutory guidance on enforcing parking restrictions",
    url: "https://www.gov.uk/government/publications/civil-enforcement-of-parking-contraventions/guidance-for-local-authorities-on-enforcing-parking-restrictions",
  },
  lambethCharges: {
    label: "Lambeth: penalty charges from 7 April 2025",
    url: "https://lambeth.gov.uk/parking/parking-fines-and-penalty-charge-notices-pcns/penalty-charge-notices-pcns/notice-changes-penalty-charges-additional-fees",
  },
  lambethInformal: {
    label: "Lambeth: make an informal challenge",
    url: "https://www.lambeth.gov.uk/parking/parking-fines-and-penalty-charge-notices-pcns/appeal-penalty-charge-notice-pcn-or-removal-your-vehicle/make-informal-challenge",
  },
  lambethFormal: {
    label: "Lambeth: make a formal appeal (representation)",
    url: "https://lambeth.gov.uk/parking/parking-fines-and-penalty-charge-notices-pcns/appeal-penalty-charge-notice-pcn-or-removal-your-vehicle/make-formal-appeal-representation",
  },
  londonCouncils: {
    label: "London Councils: do not ignore PCNs",
    url: "https://www.londoncouncils.gov.uk/node/6173",
  },
  tribunal: {
    label: "London Tribunals (independent adjudicators)",
    url: "https://www.londontribunals.gov.uk",
  },
} satisfies Record<string, TicketSource>;

/** Lambeth's charges from 7 April 2025, half if paid in time (TICKET_SOURCES.lambethCharges). */
export const LAMBETH_CHARGES: readonly { what: string; full: number; half: number }[] = [
  { what: "Higher-level parking, Band A", full: 160, half: 80 },
  { what: "Higher-level parking, Band B", full: 140, half: 70 },
  { what: "Lower-level parking, Band A", full: 110, half: 55 },
  { what: "Lower-level parking, Band B", full: 90, half: 45 },
  { what: "Bus lane", full: 160, half: 80 },
  { what: "Moving traffic (school streets, no entry, banned turns, yellow boxes)", full: 160, half: 80 },
];

export type TicketReason = {
  id: string;
  /** What the person ticks, in their words. */
  ask: string;
  /** The legal ground it may fall under, or null when it isn't one (asking for discretion). */
  ground: string | null;
  /** Plain-English why, with no promise of the outcome. */
  why: string;
  evidence: readonly string[];
  source: TicketSource;
};

const OWNER_EVIDENCE = [
  "If you'd sold it or not yet bought it: the date of sale and the DVLA's confirmation or your V5C slip",
  "If it was stolen: the police crime reference number",
  "If it was hired: the hire agreement, with the hirer's signed statement of liability",
] as const;

const PARKING_REASONS: readonly TicketReason[] = [
  {
    id: "signs",
    ask: "The signs or lines were missing, worn, hidden or confusing",
    ground: "The contravention did not occur",
    why: "A restriction has to be shown properly where you parked. The government's guidance says that when a sign or marking was defective, the council should accept the challenge.",
    evidence: [
      "Photos of the signs and lines from where you parked: one wide, one close up",
      "Take them as soon as you can, and note the date",
      "Google Street View's older images can show how long a sign or line has been missing or worn",
    ],
    source: TICKET_SOURCES.guidance,
  },
  {
    id: "suspended",
    ask: "The bay was suspended, but the suspension signs weren't there or weren't clear when I parked",
    ground: "The contravention did not occur",
    why: "A suspension, like any restriction, has to be clearly signed. Say when you parked, and what was there at the time.",
    evidence: [
      "Photos showing where the suspension signs were, or that there weren't any",
      "Proof of when you parked: a payment record, a message, a receipt nearby",
    ],
    source: TICKET_SOURCES.guidance,
  },
  {
    id: "grace",
    ask: "I was in a parking bay, and the ticket came within 10 minutes of my paid or allowed time running out",
    ground: "The contravention did not occur",
    why: "In a parking place, a ticket must not be issued in the 10 minutes after your paid or allowed time ends. The government's guidance says a ticket in that time would be illegal, unless the car was parked unlawfully for another reason.",
    evidence: [
      "Your payment receipt or the app's record, showing when your time ended",
      "The time printed on the ticket",
    ],
    source: TICKET_SOURCES.guidance,
  },
  {
    id: "paid",
    ask: "I had paid, or had a valid permit or visitor voucher, but it wasn't seen or Lambeth's system got it wrong",
    ground: "The contravention did not occur",
    why: "If you were allowed to park there, there was no contravention, even if the payment or permit didn't show up for the officer.",
    evidence: [
      "The payment receipt or app record for that time",
      "Your permit or voucher details, and any emails from Lambeth about it",
      "A bank statement line showing the payment",
    ],
    source: TICKET_SOURCES.parkingRegs,
  },
  {
    id: "exempt",
    ask: "I was loading or unloading, dropping off or picking up a passenger, or showing a valid Blue Badge",
    ground: "The contravention did not occur",
    why: "Traffic orders often allow some of these, but it depends on the exact restriction where you stopped. Say exactly what you were doing, and for how long.",
    evidence: [
      "Delivery notes, receipts or messages showing what you were loading and where",
      "A short statement from anyone with you",
      "For a Blue Badge: a photo of the badge and clock as displayed",
    ],
    source: TICKET_SOURCES.parkingRegs,
  },
  {
    id: "owner",
    ask: "The car wasn't mine at the time (sold, not yet bought), was stolen, or was hired",
    ground: "I wasn't the owner, or the car was taken or hired",
    why: "These are separate grounds in the law. The ticket should go to whoever was responsible.",
    evidence: OWNER_EVIDENCE,
    source: TICKET_SOURCES.parkingRegs,
  },
  {
    id: "amount",
    ask: "The amount is more than Lambeth's charge for what the ticket says I did",
    ground: "The penalty is more than the amount that applies",
    why: "Each contravention has a set level. Check the amount on your ticket against Lambeth's published charges below.",
    evidence: ["The contravention code and amount printed on your ticket", "Lambeth's published charges (linked below)"],
    source: TICKET_SOURCES.lambethCharges,
  },
  {
    id: "process",
    ask: "Lambeth didn't follow the process: wrong details on the notice, a notice that arrived very late, or a challenge that was never answered",
    ground: "Procedural impropriety by the council",
    why: "The council has to follow the steps the rules set out. A small slip that didn't affect you may not be enough on its own, so say what went wrong and how it affected you.",
    evidence: ["Every notice and letter you've had, with the envelopes and dates", "Copies or screenshots of anything you sent, with dates"],
    source: TICKET_SOURCES.parkingRegs,
  },
  {
    id: "already_paid",
    ask: "I've already paid this ticket",
    ground: "The penalty had already been paid",
    why: "A Notice to Owner should not be sent for a ticket that was already paid, in full or at the discount in time.",
    evidence: ["Your payment confirmation, with the date and amount"],
    source: TICKET_SOURCES.parkingRegs,
  },
];

/** Only for parking tickets that came by post from a camera. */
const CAMERA_REASON: TicketReason = {
  id: "camera_not_allowed",
  ask: "It's a camera ticket for parking somewhere other than a bus lane, a bus stop or stand, school entrance zig-zags, a red route or a mandatory cycle lane",
  ground: "The council wasn't allowed to issue this ticket by camera",
  why: "Since 31 May 2022, councils in England can only use a camera to enforce parking in those places. Anywhere else, a parking ticket has to be fixed to the car or handed to the driver. This doesn't apply if a parking officer started to issue the ticket and was stopped, for example because the car drove away: that notice can be posted too, and it should say so.",
  evidence: [
    "The notice itself: it should say whether a camera or a parking officer saw the car",
    "Photos showing the spot isn't a bus lane, bus stop or stand, school zig-zags, red route or mandatory cycle lane",
  ],
  source: TICKET_SOURCES.cameraRegs,
};

const MOVING_REASONS: readonly TicketReason[] = [
  {
    id: "signs",
    ask: "The signs were missing, hidden or unclear as I drove up",
    ground: "There was no contravention",
    why: "A school street, no entry or banned turn has to be signed so a driver can see it in time.",
    evidence: [
      "Photos of the signs from a driver's view, on the approach",
      "Google Street View's older images of the same spot",
      "The council's video of your car: ask to see it",
    ],
    source: TICKET_SOURCES.movingAct,
  },
  {
    id: "exempt",
    ask: "My vehicle had an exemption or permit for that restriction (for example, a school street exemption)",
    ground: "There was no contravention",
    why: "An exempt vehicle doesn't break the restriction. Exemptions usually have to be registered first, so give the details.",
    evidence: ["The email or letter confirming your exemption, and the vehicle it covers"],
    source: TICKET_SOURCES.movingAct,
  },
  {
    id: "video",
    ask: "The council's video doesn't show what the notice says I did",
    ground: "There was no contravention",
    why: "The council's evidence has to show the contravention. Watch it before you decide.",
    evidence: ["The council's video and photos", "Your own dashcam footage, if you have it"],
    source: TICKET_SOURCES.movingAct,
  },
  {
    id: "owner",
    ask: "The car wasn't mine at the time (sold, not yet bought), was stolen, or was hired",
    ground: "I wasn't the owner, or the car was taken or hired",
    why: "These are separate grounds in the law. The ticket should go to whoever was responsible.",
    evidence: OWNER_EVIDENCE,
    source: TICKET_SOURCES.movingAct,
  },
  {
    id: "amount",
    ask: "The amount is more than Lambeth's charge",
    ground: "The penalty is more than the amount that applies",
    why: "Lambeth's moving traffic charge is £160, or £80 if paid in time. Check the amount printed on your notice.",
    evidence: ["The amount printed on your notice", "Lambeth's published charges (linked below)"],
    source: TICKET_SOURCES.lambethCharges,
  },
];

/** Not a legal ground: the council may still cancel a ticket at any point, at its discretion. */
export const DISCRETION_REASON: TicketReason = {
  id: "discretion",
  ask: "None of these, but something outside my control happened (an emergency, a breakdown, an illness)",
  ground: null,
  why: "This isn't one of the legal grounds, but the council can cancel a ticket at any point, and the government's guidance asks councils to use that discretion fairly. Explain plainly what happened, and send proof. Stick to the facts: a short, true account carries more weight than a long one.",
  evidence: ["Proof of what happened: a hospital letter, a breakdown receipt, a message from that day"],
  source: TICKET_SOURCES.guidance,
};

export function reasonsFor(kind: TicketKind): readonly TicketReason[] {
  if (kind === "moving") return MOVING_REASONS;
  return kind === "camera_parking" ? [CAMERA_REASON, ...PARKING_REASONS] : PARKING_REASONS;
}

export type TicketStep = { title: string; detail: string; by?: string; source: TicketSource };

const DAY_MS = 86_400_000;

/** "Within N days beginning with" a date: the last day is the date plus N − 1. */
export function lastDay(fromIso: string, days: number): string {
  const t = Date.parse(`${fromIso}T00:00:00Z`);
  if (!Number.isFinite(t)) throw new Error(`Not a date: ${fromIso}`);
  return new Date(t + (days - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Days from today to a date, counting today as 0. Negative once it has passed. */
export function daysLeft(todayIso: string, byIso: string): number {
  return Math.round((Date.parse(`${byIso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / DAY_MS);
}

/**
 * The steps and their dates, counted from the date on the notice. A posted notice counts from the
 * day it was served, which is after the date printed on it, so counting from the printed date is
 * the safe, earlier deadline.
 */
export function ticketSteps(kind: TicketKind, noticeIso: string): TicketStep[] {
  const halfDays = kind === "camera_parking" ? 21 : 14;
  const half: TicketStep = {
    title: "Pay half",
    detail:
      kind === "street"
        ? "Half the charge if Lambeth receives payment within 14 days. Lambeth's page says that if you challenge within these 14 days and lose, you still get the half price."
        : `Half the charge if Lambeth receives payment within ${halfDays} days.`,
    by: lastDay(noticeIso, halfDays),
    source: kind === "street" ? TICKET_SOURCES.lambethInformal : TICKET_SOURCES.lambethCharges,
  };
  const tribunal: TicketStep = {
    title: "Appeal to the independent adjudicator",
    detail:
      "If Lambeth rejects your formal challenge, you have 28 days from its rejection notice to appeal to London Tribunals. The adjudicators are independent of the council.",
    source: TICKET_SOURCES.tribunal,
  };
  const ignore: TicketStep = {
    title: "Don't ignore it",
    detail:
      "If nothing is paid or challenged in time, the charge can go up by 50% with a Charge Certificate, and then be recovered through the County Court. Paying closes the case, so only pay if you've decided not to challenge.",
    source: TICKET_SOURCES.londonCouncils,
  };
  if (kind === "street") {
    return [
      half,
      {
        title: "Informal challenge",
        detail: "Online, any time up to 28 days after the ticket was issued. Challenging in the first 14 days keeps the half price if Lambeth says no.",
        by: lastDay(noticeIso, 28),
        source: TICKET_SOURCES.lambethInformal,
      },
      {
        title: "Formal challenge (representation)",
        detail:
          "If the ticket isn't paid or challenged within 28 days, Lambeth posts a Notice to Owner. You then have 28 days from that notice to make a formal challenge, and Lambeth must reply within 56 days.",
        source: TICKET_SOURCES.parkingRegs,
      },
      tribunal,
      ignore,
    ];
  }
  return [
    half,
    {
      title: "Formal challenge (representation)",
      detail:
        "This notice came by post, so there's no informal stage: you challenge it formally, within 28 days of it being served. We count from the date on the notice, the safe earlier date.",
      by: lastDay(noticeIso, 28),
      source: kind === "moving" ? TICKET_SOURCES.movingAct : TICKET_SOURCES.lambethFormal,
    },
    tribunal,
    ignore,
  ];
}

export type TicketVerdict = "grounds" | "discretion_only" | "none";

export function ticketVerdict(ticked: readonly string[], kind: TicketKind): TicketVerdict {
  const legal = reasonsFor(kind).filter((r) => ticked.includes(r.id));
  if (legal.length) return "grounds";
  return ticked.includes(DISCRETION_REASON.id) ? "discretion_only" : "none";
}
