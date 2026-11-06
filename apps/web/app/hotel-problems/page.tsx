import type { Metadata } from "next";
import Link from "next/link";
import { EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "When the hotel isn't what you paid for — TrueVsAd",
  description:
    "The most common problems between holidaymakers and hotels: the wrong room, dirty or broken rooms, surprise charges, closed facilities, being moved, and what to do about each.",
};

/** Checked on: update when the sources below are re-read. */
const CHECKED = "6 November 2026";

type Upset = { title: string; looksLike: string; atHotel: string[]; rights: string };

const UPSETS: Upset[] = [
  {
    title: "The room isn't the one you booked",
    looksLike:
      "A smaller or older room, no sea view, two singles instead of a double, or a room that doesn't match the photos you were shown. It's the most common serious complaint.",
    atHotel: [
      "Show the desk your screenshot of the room type and photos, and ask for the room you paid for.",
      "If they can't give it to you, ask them to write down what you got instead, and keep it.",
      "On a package holiday, tell the holiday company's rep or helpline straight away too.",
    ],
    rights:
      "On a package, the company that sold it must put it right or offer a similar room, and give a price reduction if what you get is worse.",
  },
  {
    title: "Dirty, mouldy or broken",
    looksLike:
      "Stained bedding, mould in the bathroom, a previous guest's rubbish, broken locks, air conditioning that doesn't work. Star ratings don't protect you here: they mostly measure facilities, not cleanliness or condition.",
    atHotel: [
      "Take photos and a short video before you unpack, with the date showing on your phone.",
      "Ask for another room, or for it to be fixed, and note the time and who you spoke to.",
      "A broken lock or anything unsafe: ask to move at once, and tell the rep on a package.",
    ],
    rights:
      "A room that's dirty or unsafe isn't the service you paid for. On a package you can claim a price reduction or compensation; on a credit card, Section 75 can help.",
  },
  {
    title: "Charges you weren't told about",
    looksLike:
      "A tourist tax, \"resort\" or cleaning fee asked for at the desk, a deposit you didn't expect, or extras on the bill you never chose.",
    atHotel: [
      "Ask what each charge is, and whether it was in your booking. Ask for a written receipt for anything you pay.",
      "A local tourist tax is a real government charge and usually has to be paid, but you should have been told about it before you paid.",
      "Check the final bill line by line before you sign, and photograph the room on departure if they mention damage.",
    ],
    rights:
      "In the UK, every unavoidable charge must be in the headline price, and extras must be actively chosen, never added by default. TrueVsAd's receipt shows local taxes before you book.",
  },
  {
    title: "The pool, kids' club or restaurant is closed",
    looksLike:
      "A facility the advert promised is shut, a long walk away, or behind building works nobody mentioned.",
    atHotel: [
      "Photograph the closed facility or the works, and keep the advert that promised it.",
      "Ask the hotel, or the rep on a package, what they'll offer instead.",
    ],
    rights:
      "If the facility was part of what you were sold, its absence can mean a price reduction, especially on a package.",
  },
  {
    title: "Moved to another hotel",
    looksLike:
      "The hotel is overbooked and sends you elsewhere, or your package is switched to a different, lower-standard hotel.",
    atHotel: [
      "Ask for a similar or better room nearby, and for the hotel to pay the taxi and any extra cost.",
      "Don't accept just a refund on the spot if you still need a room tonight. Keep every receipt.",
    ],
    rights:
      "On a package, a lower-standard replacement means a price reduction, and a big change before you travel can let you cancel for a full refund.",
  },
  {
    title: "The \"from\" price wasn't real",
    looksLike:
      "An advert shows \"rooms from £X\", but almost no rooms or dates are ever available at that price.",
    atHotel: [
      "This happens before you arrive: screenshot the advert and the price you were actually offered.",
    ],
    rights:
      "The Advertising Standards Authority has ruled that \"from\" prices must reflect real availability. You can report an advert to the ASA.",
  },
  {
    title: "A scam around the booking",
    looksLike:
      "A message asking you to \"confirm\" your booking by bank transfer or by re-entering card details, or a listing for a property that isn't really offered.",
    atHotel: [
      "Never pay by bank transfer from a message, even one that looks like it comes from a booking site.",
      "Call the hotel or the booking site on a number you found yourself, not one in the message.",
    ],
    rights:
      "If you've paid a scammer, call your bank straight away on the number on your card.",
  },
];

export default function HotelProblemsPage() {
  return (
    <main>
      <h1>When the hotel isn&apos;t what you paid for</h1>
      <p className="lead">
        The wrong room, mould, a surprise bill at the desk. These are the problems families report most, and what
        to do about each, before you book, at the hotel and afterwards.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Before you book</h2>
        <ul>
          <li>
            <strong>Screenshot the room:</strong> its name, size, view, photos and what&apos;s included, plus the full
            price. If the room isn&apos;t what was advertised, that screenshot is your proof.
          </li>
          <li>
            <strong>Don&apos;t rely on stars.</strong> There&apos;s no international standard: France, Italy and Spain
            use their own, some booking sites show stars the hotel chose itself, and stars mostly measure facilities,
            not cleanliness. Look for the room size and recent photos.
          </li>
          <li>
            <strong>Check the true price</strong> with the <Link href="/xray">Deal X-ray</Link>, including local taxes
            paid at the hotel, and what&apos;s really around it with <Link href="/visit">Visit before you book</Link>.
          </li>
          <li>
            <strong>Know what you&apos;re buying.</strong> A package (flight and hotel sold together) gives you the
            strongest rights. Your receipt says which help applies.
          </li>
          <li>
            <strong>Pay by credit card</strong> for anything between £100 and £30,000, so Section 75 can help if it
            goes wrong.
          </li>
        </ul>
      </div>

      <h2>The seven most common problems</h2>
      {UPSETS.map((u) => (
        <div className="card" key={u.title}>
          <h3 style={{ marginTop: 0 }}>{u.title}</h3>
          <p>{u.looksLike}</p>
          <p>
            <strong>What to do:</strong>
          </p>
          <ul>
            {u.atHotel.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="hint">
            <strong>Your rights:</strong> {u.rights}
          </p>
        </div>
      ))}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Evidence that counts</h2>
        <ul>
          <li>Your booking confirmation and the screenshots from before you booked.</li>
          <li>Photos and videos on arrival, before you unpack.</li>
          <li>Notes of who you spoke to, when, and what they said or offered.</li>
          <li>Receipts for anything you had to pay extra.</li>
          <li>Names and contact details of other guests with the same problem.</li>
        </ul>
        <p>
          <strong>Complain on the spot.</strong> On a package, the law expects you to report a problem while
          you&apos;re there, without undue delay, so the company has a chance to fix it. Then put it in writing when you
          get home.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who has to put it right</h2>
        <ul>
          <li>
            <strong>Package holiday:</strong> the company that sold you the package is responsible for the hotel, even
            though it doesn&apos;t run it (
            <a href="https://www.legislation.gov.uk/uksi/2018/634/regulation/15" target="_blank" rel="noopener noreferrer">
              Package Travel Regulations 2018, regulation 15
            </a>
            ).
          </li>
          <li>
            <strong>Hotel booked through a UK company:</strong> the Consumer Rights Act 2015 may help.
          </li>
          <li>
            <strong>Hotel booked directly abroad:</strong> that country&apos;s law applies. The UK International
            Consumer Centre can help with cross-border problems.
          </li>
          <li>
            <strong>Paid by credit card (£100 to £30,000):</strong> claim from the card company under Section 75. On a
            debit card, ask your bank about a chargeback.
          </li>
          <li>
            <strong>Still stuck:</strong> the company&apos;s dispute scheme (for example ABTA, if it&apos;s a member),
            then the small claims court.
          </li>
        </ul>
        <p>
          <strong>To stop it happening to others:</strong> report misleading adverts to the{" "}
          <a href="https://www.asa.org.uk/make-a-complaint/guide-to-making-a-complaint.html" target="_blank" rel="noopener noreferrer">
            Advertising Standards Authority
          </a>
          , and unfair traders to Trading Standards through the Consumer Helpline (0808 223 1133).
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What TrueVsAd does about it</h2>
        <ul>
          <li>
            <strong>FairMark</strong> shows what an advert left out of the price, for every deal you check.
          </li>
          <li>
            <strong>Our <Link href="/sellers">Fair Seller standard</Link></strong> asks featured hotels to name the
            exact room type, show photos of that room, list every extra with its price, and say what isn&apos;t
            included. A mismatch reported by families counts as a strike.
          </li>
          <li>
            <strong>We don&apos;t rate hotels&apos; cleanliness or location,</strong> and we don&apos;t post
            families&apos; complaints about named hotels. We can only check what&apos;s provable: the price, and later,
            whether a room matched its description, from families who actually stayed.
          </li>
        </ul>
        <p>
          If a deal you checked on TrueVsAd turned out different from its advert, tell us privately at{" "}
          <a href={`mailto:${EMAILS.corrections}?subject=Hotel%20not%20as%20advertised`}>{EMAILS.corrections}</a>,
          with your receipt link. Black out names and booking references first. We never post what you send.
        </p>
      </div>

      <p className="hint">
        General information, not legal advice: your rights depend on how and where you booked. Checked {CHECKED},
        using{" "}
        <a
          href="https://www.which.co.uk/news/article/nightmare-holiday-you-might-be-able-to-claim-your-money-back-aMB9i4V6WNPY"
          target="_blank"
          rel="noopener noreferrer"
        >
          Which?
        </a>
        ,{" "}
        <a
          href="https://www.which.co.uk/reviews/uk-hotel-chains/article/hotel-star-ratings-explained"
          target="_blank"
          rel="noopener noreferrer"
        >
          Which? on star ratings
        </a>
        ,{" "}
        <a
          href="https://www.eccireland.ie/wish-we-werent-here-how-to-solve-accommodation-and-package-holiday-problems/"
          target="_blank"
          rel="noopener noreferrer"
        >
          ECC Ireland
        </a>
        , the{" "}
        <a href="https://www.legislation.gov.uk/uksi/2018/634/regulation/15" target="_blank" rel="noopener noreferrer">
          Package Travel Regulations
        </a>{" "}
        and the CMA&apos;s price rules.
      </p>
    </main>
  );
}
