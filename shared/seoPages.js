// SEO landing pages — one real address per campus / student neighbourhood.
//
// Used by BOTH sides:
//   • server/index.js  → fills in each page's own <title>, description, canonical
//                        link and crawler-visible text before sending index.html
//   • src/App.jsx      → routes to the page and filters the listings
//
// To add a page, add one object below and one <url> line to public/sitemap.xml.
// `keywords` are matched (case-insensitive) against a listing's university,
// name, location description and distance text.

export const SEO_PAGES = [
  // ───────── Campuses ─────────
  {
    slug: "hostels-near-ktu",
    kind: "campus",
    name: "KTU, Koforidua",
    short: "KTU",
    keywords: ["ktu", "koforidua technical", "koforidua"],
    title: "Hostels Near KTU, Koforidua | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near Koforidua Technical University (KTU). Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near KTU, Koforidua",
    intro:
      "Browse student hostels, self-contained rooms and apartments near Koforidua Technical University (KTU). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-around-legon",
    kind: "campus",
    name: "Legon (University of Ghana)",
    short: "Legon",
    keywords: ["legon", "university of ghana", "ug"],
    title: "Hostels Around Legon (UG) | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments around Legon and the University of Ghana. Compare 1 to 4-in-a-room options and WhatsApp owners.",
    h1: "Hostels around Legon and the University of Ghana",
    intro:
      "Browse student hostels, self-contained rooms and shared apartments around the University of Ghana, Legon, including North Legon and Madina. Compare room types from one-in-a-room to four-in-a-room and contact owners directly on WhatsApp.",
    related: ["hostels-near-upsa", "hostels-in-north-legon", "hostels-in-madina"],
  },
  {
    slug: "hostels-near-upsa",
    kind: "campus",
    name: "UPSA, Accra",
    short: "UPSA",
    keywords: ["upsa", "university of professional studies"],
    title: "Hostels Near UPSA, Accra | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near UPSA in Accra, around Madina and North Legon. Compare prices and WhatsApp owners directly.",
    h1: "Hostels near UPSA, Accra",
    intro:
      "Browse student hostels and apartments near the University of Professional Studies, Accra (UPSA), including nearby areas like Madina and North Legon. Compare room types and contact owners directly.",
    related: ["hostels-around-legon", "hostels-in-madina"],
  },
  {
    slug: "hostels-near-cu",
    kind: "campus",
    name: "Central University (CU)",
    short: "CU",
    keywords: ["central university", "cu"],
    title: "Hostels Near CU | Central University Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near Central University (CU). Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near Central University (CU)",
    intro:
      "Browse student hostels, self-contained rooms and apartments near Central University (CU). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-rmu",
    kind: "campus",
    name: "RMU, Nungua",
    short: "RMU",
    keywords: ["rmu", "regional maritime", "nungua"],
    title: "Hostels Near RMU, Nungua | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near the Regional Maritime University (RMU) in Nungua. Compare prices and WhatsApp owners directly.",
    h1: "Hostels near RMU, Nungua",
    intro:
      "Browse student hostels, self-contained rooms and apartments near the Regional Maritime University (RMU), Nungua. Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },

  // ───────── Student neighbourhoods ─────────
  {
    slug: "hostels-in-madina",
    kind: "area",
    name: "Madina, Accra",
    short: "Madina",
    keywords: ["madina"],
    title: "Hostels in Madina, Accra | Student Rooms | BookInn",
    description:
      "Student hostels, self-contained rooms and apartments in Madina, close to Legon and UPSA. Compare prices and WhatsApp owners directly.",
    h1: "Hostels in Madina, near Legon and UPSA",
    intro:
      "Madina is a popular, more affordable option for students of the University of Ghana and UPSA. Browse hostels and rooms here and contact owners directly.",
    related: ["hostels-around-legon", "hostels-near-upsa"],
  },
  {
    slug: "hostels-in-north-legon",
    kind: "area",
    name: "North Legon, Accra",
    short: "North Legon",
    keywords: ["north legon"],
    title: "Hostels in North Legon, Accra | Student Rooms | BookInn",
    description:
      "Student hostels and self-contained rooms in North Legon, minutes from the University of Ghana. Compare prices and WhatsApp owners directly.",
    h1: "Hostels in North Legon, Accra",
    intro:
      "Browse student hostels and self-contained rooms in North Legon, minutes from the University of Ghana campus. Compare room types and prices and contact owners directly.",
    related: ["hostels-around-legon", "hostels-in-madina"],
  },
];

export const seoPagePath = (page) => `/${page.slug}`;
export const findSeoPageByPath = (pathname) => {
  const clean = String(pathname || "").replace(/\/+$/, "") || "/";
  return SEO_PAGES.find((p) => seoPagePath(p) === clean) || null;
};

// True when a listing belongs on a landing page.
export function matchesSeoPage(listing, page) {
  const hay = ` ${[listing.university, listing.name, listing.locationDescription, listing.distance]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase()} `;
  // Whole-word match, so short names like "cu" or "ug" don't match inside other words.
  return page.keywords.some((k) => new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(hay));
}
