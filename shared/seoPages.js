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
    slug: "hostels-around-legon",
    kind: "campus",
    name: "Legon (University of Ghana)",
    short: "Legon",
    keywords: ["legon", "university of ghana"],
    title: "Hostels Around Legon (UG) | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments around Legon and the University of Ghana. Compare 1 to 4-in-a-room options and WhatsApp owners.",
    h1: "Hostels around Legon and the University of Ghana",
    intro:
      "Browse student hostels, self-contained rooms and shared apartments around the University of Ghana, Legon, including North Legon, East Legon, Madina and Haatso. Compare room types from one-in-a-room to four-in-a-room and contact owners directly on WhatsApp.",
    related: ["hostels-in-north-legon", "hostels-in-east-legon", "hostels-in-madina"],
  },
  {
    slug: "hostels-near-knust",
    kind: "campus",
    name: "KNUST, Kumasi",
    short: "KNUST",
    keywords: ["knust", "kwame nkrumah", "kumasi"],
    title: "Hostels Near KNUST, Kumasi | Student Rooms | BookInn",
    description:
      "Find student hostels and self-contained rooms near KNUST in Kumasi, including Ayeduase, Bomso and Kotei. Compare room types and prices, then WhatsApp owners.",
    h1: "Hostels near KNUST, Kumasi",
    intro:
      "Browse student hostels and apartments near Kwame Nkrumah University of Science and Technology, including popular student areas such as Ayeduase, Bomso, Kotei and Boadi. Compare room types and prices, then message owners on WhatsApp.",
    related: ["hostels-in-ayeduase", "hostels-in-bomso"],
  },
  {
    slug: "hostels-near-ucc",
    kind: "campus",
    name: "UCC, Cape Coast",
    short: "UCC",
    keywords: ["ucc", "university of cape coast", "cape coast"],
    title: "Hostels Near UCC, Cape Coast | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near the University of Cape Coast (UCC). Compare options and WhatsApp owners directly.",
    h1: "Hostels near UCC, Cape Coast",
    intro:
      "Browse student hostels and apartments near the University of Cape Coast. Compare room types, prices and facilities, and contact owners directly.",
    related: [],
  },
  {
    slug: "hostels-near-upsa",
    kind: "campus",
    name: "UPSA, Accra",
    short: "UPSA",
    keywords: ["upsa", "university of professional studies"],
    title: "Hostels Near UPSA, Accra | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near UPSA in Accra, around Madina, Haatso and North Legon. Compare prices and WhatsApp owners.",
    h1: "Hostels near UPSA, Accra",
    intro:
      "Browse student hostels and apartments near the University of Professional Studies, Accra (UPSA), including nearby areas like Madina, Haatso and Atomic. Compare room types and contact owners directly.",
    related: ["hostels-in-madina", "hostels-in-north-legon"],
  },
  {
    slug: "hostels-near-uew",
    kind: "campus",
    name: "UEW, Winneba",
    short: "UEW",
    keywords: ["uew", "university of education", "winneba"],
    title: "Hostels Near UEW, Winneba | Student Rooms | BookInn",
    description:
      "Find student hostels, self-contained rooms and apartments near the University of Education, Winneba (UEW). Compare options and WhatsApp owners directly.",
    h1: "Hostels near UEW, Winneba",
    intro:
      "Browse student hostels and apartments near the University of Education, Winneba. Compare room types, prices and facilities, and message owners directly.",
    related: [],
  },

  // ───────── Student neighbourhoods ─────────
  {
    slug: "hostels-in-ayeduase",
    kind: "area",
    name: "Ayeduase, Kumasi",
    short: "Ayeduase",
    keywords: ["ayeduase"],
    title: "Hostels in Ayeduase, Kumasi | Near KNUST | BookInn",
    description:
      "Student hostels and self-contained rooms in Ayeduase, right next to KNUST. Compare one to four-in-a-room options and WhatsApp owners directly.",
    h1: "Hostels in Ayeduase, near KNUST",
    intro:
      "Ayeduase is one of the most popular student areas next to KNUST. Browse hostels and self-contained rooms here, compare room types and prices, and contact owners directly.",
    related: ["hostels-near-knust", "hostels-in-bomso"],
  },
  {
    slug: "hostels-in-bomso",
    kind: "area",
    name: "Bomso, Kumasi",
    short: "Bomso",
    keywords: ["bomso"],
    title: "Hostels in Bomso, Kumasi | Near KNUST | BookInn",
    description:
      "Student hostels and self-contained rooms in Bomso near KNUST. Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels in Bomso, near KNUST",
    intro:
      "Bomso is a busy student community close to KNUST. Browse hostels and apartments here, compare room types and prices, and message owners on WhatsApp.",
    related: ["hostels-near-knust", "hostels-in-ayeduase"],
  },
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
    slug: "hostels-in-east-legon",
    kind: "area",
    name: "East Legon, Accra",
    short: "East Legon",
    keywords: ["east legon"],
    title: "Hostels in East Legon, Accra | Student Rooms | BookInn",
    description:
      "Student hostels and apartments in East Legon, near the University of Ghana. Compare room types and prices and WhatsApp owners directly.",
    h1: "Hostels in East Legon, Accra",
    intro:
      "Browse student hostels and apartments in East Legon, close to the University of Ghana. Compare room types and prices and message owners directly.",
    related: ["hostels-around-legon", "hostels-in-north-legon"],
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
  return page.keywords.some((k) => hay.includes(k.toLowerCase()));
}
