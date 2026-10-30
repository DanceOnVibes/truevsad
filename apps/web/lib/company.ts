/** Legal and contact details — one place, used across the site. */
export const COMPANY = {
  name: "DanceOnVibes Limited",
  type: "a private limited company registered in England and Wales",
  number: "17423769",
  ico: "ZC249791",
  address: "167–169 Great Portland Street, 5th Floor, London, W1W 5PF, United Kingdom",
} as const;

export const EMAILS = {
  /** General questions and feedback. */
  hello: "hello@truevsad.co.uk",
  /** Data protection requests (access, deletion). */
  privacy: "privacy@truevsad.co.uk",
  /** "This figure on my receipt is wrong" — fee corrections from families. */
  corrections: "corrections@truevsad.co.uk",
  /** Holiday sellers: listings, Fair Price Verified, partnerships. */
  partners: "partners@truevsad.co.uk",
  /** Security vulnerability reports (also in /.well-known/security.txt). */
  security: "security@truevsad.co.uk",
} as const;
