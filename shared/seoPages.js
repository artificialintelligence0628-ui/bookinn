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
  {
    slug: "hostels-near-knust",
    kind: "campus",
    name: "KNUST, Kumasi",
    short: "KNUST",
    keywords: ["knust", "kwame nkrumah", "kumasi"],
    title: "Hostels Near KNUST, Kumasi | Student Rooms | BookInn",
    description: "Find student hostels and self-contained rooms near KNUST in Kumasi, including Ayeduase, Bomso and Kotei. Compare prices and WhatsApp owners directly.",
    h1: "Hostels near KNUST, Kumasi",
    intro: "Browse student hostels and apartments near Kwame Nkrumah University of Science and Technology, including popular student areas such as Ayeduase, Bomso, Kotei and Boadi. Compare room types and prices, then message owners on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-around-legon",
    kind: "campus",
    name: "UG / UPSA, Accra",
    short: "UG & UPSA",
    keywords: ["legon", "university of ghana", "ug", "upsa", "university of professional studies"],
    title: "Hostels Near UG (Legon) & UPSA, Accra | BookInn",
    description: "Find student hostels, self-contained rooms and apartments around Legon (UG) and UPSA. Compare 1 to 4-in-a-room options and WhatsApp owners directly.",
    h1: "Hostels around UG (Legon) and UPSA, Accra",
    intro: "Browse student hostels, self-contained rooms and shared apartments around the University of Ghana, Legon and the University of Professional Studies, Accra (UPSA), including North Legon and Madina. Compare room types from one-in-a-room to four-in-a-room and contact owners directly on WhatsApp.",
    related: ["hostels-in-north-legon", "hostels-in-madina"],
  },
  {
    slug: "hostels-near-ucc",
    kind: "campus",
    name: "UCC, Cape Coast",
    short: "UCC",
    keywords: ["ucc", "university of cape coast", "cape coast"],
    title: "Hostels Near UCC, Cape Coast | Student Rooms | BookInn",
    description: "Find student hostels, self-contained rooms and apartments near the University of Cape Coast (UCC). Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near UCC, Cape Coast",
    intro: "Browse student hostels, self-contained rooms and apartments near the University of Cape Coast (UCC). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-ktu",
    kind: "campus",
    name: "KTU, Koforidua",
    short: "KTU",
    keywords: ["ktu", "koforidua technical", "koforidua"],
    title: "Hostels Near KTU, Koforidua | Student Rooms | BookInn",
    description: "Find student hostels, self-contained rooms and apartments near Koforidua Technical University (KTU). Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near KTU, Koforidua",
    intro: "Browse student hostels, self-contained rooms and apartments near Koforidua Technical University (KTU). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-atu",
    kind: "campus",
    name: "ATU, Accra",
    short: "ATU",
    keywords: ["atu", "accra technical"],
    title: "Hostels Near ATU, Accra | Student Rooms | BookInn",
    description: "Find student hostels, self-contained rooms and apartments near Accra Technical University (ATU). Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near ATU, Accra",
    intro: "Browse student hostels, self-contained rooms and apartments near Accra Technical University (ATU). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-ttu",
    kind: "campus",
    name: "TTU, Takoradi",
    short: "TTU",
    keywords: ["ttu", "takoradi technical", "takoradi"],
    title: "Hostels Near TTU, Takoradi | Student Rooms | BookInn",
    description: "Find student hostels, self-contained rooms and apartments near Takoradi Technical University (TTU). Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near TTU, Takoradi",
    intro: "Browse student hostels, self-contained rooms and apartments near Takoradi Technical University (TTU). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-cu",
    kind: "campus",
    name: "Central University, Miotso",
    short: "CU",
    keywords: ["central university", "miotso", "cu"],
    title: "Hostels Near Central University (CU), Miotso | BookInn",
    description: "Find student hostels, self-contained rooms and apartments near Central University (CU), Miotso. Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels near Central University (CU), Miotso",
    intro: "Browse student hostels, self-contained rooms and apartments near Central University (CU), Miotso. Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-rmu",
    kind: "campus",
    name: "RMU, Nungua",
    short: "RMU",
    keywords: ["rmu", "regional maritime", "nungua"],
    title: "Hostels Near RMU, Nungua | Student Rooms | BookInn",
    description: "Find student hostels, rooms and apartments near the Regional Maritime University (RMU), Nungua. Compare prices and WhatsApp owners directly.",
    h1: "Hostels near RMU, Nungua",
    intro: "Browse student hostels, self-contained rooms and apartments near the Regional Maritime University (RMU), Nungua. Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-uds",
    kind: "campus",
    name: "UDS",
    short: "UDS",
    keywords: ["uds", "university for development studies", "tamale"],
    title: "Hostels Near UDS | Student Rooms | BookInn",
    description: "Find student hostels, rooms and apartments near the University for Development Studies (UDS). Compare prices and WhatsApp owners directly.",
    h1: "Hostels near UDS",
    intro: "Browse student hostels, self-contained rooms and apartments near the University for Development Studies (UDS). Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-uhas",
    kind: "campus",
    name: "UHAS, Ho",
    short: "UHAS",
    keywords: ["uhas", "university of health and allied"],
    title: "Hostels Near UHAS, Ho | Student Rooms | BookInn",
    description: "Find student hostels, rooms and apartments near UHAS in Ho (University of Health and Allied Sciences). Compare prices and WhatsApp owners.",
    h1: "Hostels near UHAS, Ho",
    intro: "Browse student hostels, self-contained rooms and apartments near the University of Health and Allied Sciences (UHAS), Ho. Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-near-umat",
    kind: "campus",
    name: "UMaT, Tarkwa",
    short: "UMaT",
    keywords: ["umat", "university of mines", "tarkwa"],
    title: "Hostels Near UMaT, Tarkwa | Student Rooms | BookInn",
    description: "Find student hostels, rooms and apartments near UMaT in Tarkwa (University of Mines and Technology). Compare prices and WhatsApp owners.",
    h1: "Hostels near UMaT, Tarkwa",
    intro: "Browse student hostels, self-contained rooms and apartments near the University of Mines and Technology (UMaT), Tarkwa. Compare room types and prices, then contact owners directly on WhatsApp.",
    related: [],
  },
  {
    slug: "hostels-in-madina",
    kind: "area",
    name: "Madina, Accra",
    short: "Madina",
    keywords: ["madina"],
    title: "Hostels in Madina, Accra | Student Rooms | BookInn",
    description: "Student hostels, self-contained rooms and apartments in Madina, close to Legon and UPSA. Compare prices and WhatsApp owners directly.",
    h1: "Hostels in Madina, near Legon and UPSA",
    intro: "Madina is a popular, more affordable option for students of the University of Ghana and UPSA. Browse hostels and rooms here and contact owners directly.",
    related: ["hostels-around-legon", "hostels-in-north-legon"],
  },
  {
    slug: "hostels-in-north-legon",
    kind: "area",
    name: "North Legon, Accra",
    short: "North Legon",
    keywords: ["north legon"],
    title: "Hostels in North Legon, Accra | Student Rooms | BookInn",
    description: "Student hostels and self-contained rooms in North Legon, minutes from the University of Ghana. Compare prices and WhatsApp owners directly.",
    h1: "Hostels in North Legon, Accra",
    intro: "Browse student hostels and self-contained rooms in North Legon, minutes from the University of Ghana campus. Compare room types and prices and contact owners directly.",
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
