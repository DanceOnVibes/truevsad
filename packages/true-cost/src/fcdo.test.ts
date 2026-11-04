import { describe, expect, it } from "vitest";
import {
  compareNumbers,
  countryFromDisplayName,
  fcdoFreshness,
  htmlToText,
  matchFcdoCountry,
  numbersIn,
  parseTravelAdvice,
  parseTravelAdviceIndex,
} from "./fcdo";

// The shape GOV.UK's Content API returns for a travel advice guide (trimmed to what we read).
const THAILAND = {
  base_path: "/foreign-travel-advice/thailand",
  title: "Thailand travel advice",
  document_type: "travel_advice",
  public_updated_at: "2026-10-30T09:00:00.000+00:00",
  details: {
    country: { name: "Thailand", slug: "thailand", synonyms: ["Phuket", "Koh Samui"] },
    alert_status: ["avoid_all_but_essential_travel_to_parts", "not_a_real_alert"],
    parts: [
      {
        slug: "safety-and-security",
        title: "Safety and security",
        body:
          "<h2>Crime</h2><p>Pickpockets operate in tourist areas.</p>" +
          "<h2>Extreme weather and natural disasters</h2><p>Find out how to prepare.</p>" +
          "<h3>Flooding</h3><p>The monsoon season runs from May to October.</p><p>Follow local advice.</p>" +
          "<h3>Tsunamis</h3><p>Learn the warning signs &amp; evacuation routes.</p>" +
          "<h2>Road travel</h2><p>Driving can be dangerous.</p>",
      },
      {
        slug: "getting-help",
        title: "Getting help",
        body: [
          { content_type: "text/govspeak", content: "## Emergency services" },
          {
            content_type: "text/html",
            content:
              "<h2>Emergency services in Thailand</h2><p>Ambulance: 1669</p><p>Fire: 199</p><p>Police: 191</p><p>Tourist police: 1155</p>" +
              "<h2>Contact your travel provider and insurer</h2><p>Call them first.</p>",
          },
        ],
      },
    ],
  },
};

describe("FCDO: reading a travel advice guide", () => {
  const a = parseTravelAdvice(THAILAND)!;
  it("reads the country, link and date", () => {
    expect(a.slug).toBe("thailand");
    expect(a.name).toBe("Thailand");
    expect(a.url).toBe("https://www.gov.uk/foreign-travel-advice/thailand");
    expect(a.updatedAt).toBe("2026-10-30T09:00:00.000+00:00");
  });
  it("keeps only real FCDO alert codes", () => {
    expect(a.alertStatus).toEqual(["avoid_all_but_essential_travel_to_parts"]);
  });
  it("reads the emergency numbers exactly as listed, from an HTML string or a content list", () => {
    expect(a.emergency?.numbers).toEqual([
      { service: "Ambulance", number: "1669" },
      { service: "Fire", number: "199" },
      { service: "Police", number: "191" },
      { service: "Tourist police", number: "1155" },
    ]);
  });
  it("reads only the natural hazards section, one entry per sub-heading", () => {
    expect(a.hazards.map((h) => h.title)).toEqual(["Flooding", "Tsunamis"]);
    expect(a.hazards[1]!.text).toBe("Learn the warning signs & evacuation routes.");
  });
  it("ignores anything that isn't a travel advice guide", () => {
    expect(parseTravelAdvice({ document_type: "news_article", base_path: "/x" })).toBeNull();
    expect(parseTravelAdvice(null)).toBeNull();
  });
});

describe("FCDO: numbers and text", () => {
  it("finds numbers in 'Service: number' lines", () => {
    expect(numbersIn("Telephone: 112 (ambulance, fire, police)\nNothing here")).toEqual([{ service: "Ambulance, fire, police", number: "112" }]);
    expect(numbersIn("Police – 110\nFire and ambulance: 119")).toEqual([
      { service: "Police", number: "110" },
      { service: "Fire and ambulance", number: "119" },
    ]);
  });
  it("turns HTML into plain lines", () => {
    expect(htmlToText("<ul><li>One</li><li>Two&nbsp;&rsquo;s</li></ul>")).toBe("• One\n• Two ’s");
  });
});

describe("FCDO: the index", () => {
  it("lists every country with its slug and update date", () => {
    const list = parseTravelAdviceIndex({
      links: {
        children: [
          { base_path: "/foreign-travel-advice/japan", title: "Japan travel advice", public_updated_at: "2026-10-01", details: { country: { name: "Japan", slug: "japan" } } },
          { base_path: "/foreign-travel-advice/usa", title: "USA travel advice" },
          { base_path: "/somewhere-else", title: "Not a guide" },
        ],
      },
    });
    expect(list).toEqual([
      { slug: "japan", name: "Japan", synonyms: [], updatedAt: "2026-10-01" },
      { slug: "usa", name: "USA", synonyms: [], updatedAt: null },
    ]);
  });
});

describe("FCDO: which country a place is in", () => {
  const countries = [
    { slug: "thailand", name: "Thailand", synonyms: [] },
    { slug: "usa", name: "USA", synonyms: [] },
    { slug: "turkey", name: "Turkey", synonyms: [] },
    { slug: "cote-d-ivoire", name: "Côte d'Ivoire", synonyms: [] },
  ];
  it("matches the map's country name to the FCDO guide", () => {
    expect(countryFromDisplayName("Patong, Kathu District, Phuket Province, 83150, Thailand")).toBe("Thailand");
    expect(matchFcdoCountry("Thailand", countries)).toBe("thailand");
    expect(matchFcdoCountry("United States", countries)).toBe("usa");
    expect(matchFcdoCountry("Türkiye", countries)).toBe("turkey");
    expect(matchFcdoCountry("Côte d’Ivoire", countries)).toBe("cote-d-ivoire");
    expect(matchFcdoCountry("Atlantis", countries)).toBeUndefined();
  });
});

describe("FCDO: freshness and double-checks", () => {
  it("is stale after 3 days without a refresh", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(fcdoFreshness("2026-11-09T05:17:00Z", now)).toBe("fresh");
    expect(fcdoFreshness("2026-11-01T05:17:00Z", now)).toBe("stale");
    expect(fcdoFreshness("not a date", now)).toBe("stale");
  });
  it("only agrees when every FCDO number is among our double-checked ones", () => {
    const fcdo = [{ service: "Police", number: "191" }, { service: "Ambulance", number: "1669" }];
    const ok = { slug: "thailand", numbers: [{ service: "Police", number: "191" }, { service: "Ambulance", number: "1669" }], sources: [], checkedOn: "2026-11-04" };
    expect(compareNumbers(fcdo, ok)).toBe("agree");
    expect(compareNumbers(fcdo, { ...ok, numbers: [{ service: "Police", number: "191" }] })).toBe("differ");
    expect(compareNumbers(fcdo, undefined)).toBe("unchecked");
  });
});

// The real "Getting help" section of GOV.UK's Thailand travel advice (as published, Nov 2026).
const THAILAND_GETTING_HELP =
  "<h2>Emergency services in Thailand</h2>" +
  "<p>Telephone: 191 (ambulance, fire, police)</p><p>Ambulance: 1669</p><p>Fire: 199</p><p>Police: 191</p><p>Tourist police: 1155</p>" +
  "<p>The Tourist Police have developed a new application called Thailand Tourist Police to facilitate communication between tourists and our services online.</p>" +
  "<h2>Contact your travel provider and insurer</h2><p>Contact your travel provider and your insurer if you are involved in a serious incident or emergency abroad.</p>" +
  "<h2>Contacting FCDO</h2><h3>Help in the UK</h3><p>Telephone: 020 7008 5000 (24 hours)</p>";

describe("FCDO: the real Thailand page", () => {
  const a = parseTravelAdvice({
    ...THAILAND,
    details: { ...THAILAND.details, parts: [{ slug: "getting-help", title: "Getting help", body: THAILAND_GETTING_HELP }] },
  })!;
  it("reads every number once, named the way the FCDO names it", () => {
    expect(a.emergency?.numbers).toEqual([
      { service: "Ambulance, fire, police", number: "191" },
      { service: "Ambulance", number: "1669" },
      { service: "Fire", number: "199" },
      { service: "Tourist police", number: "1155" },
    ]);
  });
  it("stops at the next section, so the FCDO's London line isn't taken for a Thai number", () => {
    expect(a.emergency?.text).not.toMatch(/7008/);
    expect(a.emergency?.text).toMatch(/Tourist Police have developed/);
  });
});
