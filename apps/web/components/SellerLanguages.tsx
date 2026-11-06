import Link from "next/link";

/** The sellers page in each language. English is the official version; the others are translations. */
const LANGUAGES = [
  { code: "en", href: "/sellers", name: "English" },
  { code: "es", href: "/sellers/es", name: "Español" },
  { code: "fr", href: "/sellers/fr", name: "Français" },
  { code: "it", href: "/sellers/it", name: "Italiano" },
  { code: "el", href: "/sellers/el", name: "Ελληνικά" },
] as const;

export const SELLER_LANGUAGE_ALTERNATES = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.href]));

export function SellerLanguages({ current }: { current: (typeof LANGUAGES)[number]["code"] }) {
  return (
    <p className="hint">
      {LANGUAGES.map((l, i) => (
        <span key={l.code}>
          {i > 0 ? " · " : ""}
          {l.code === current ? (
            <strong lang={l.code}>{l.name}</strong>
          ) : (
            <Link href={l.href} lang={l.code}>
              {l.name}
            </Link>
          )}
        </span>
      ))}
    </p>
  );
}
