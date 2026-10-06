// Map positions for listings.
//
// Listings don't store coordinates yet. Until they do, a listing is placed at a
// stable, approximate spot around its university's campus so the map view is
// usable. Once a listing has real `lat` / `lng` values (see the list below),
// those are used instead and the pin is treated as exact.
//
// Campus centres are approximate — refine them, or replace this whole lookup
// with a latitude/longitude column on the `universities` table.
const CAMPUS_CENTRES = [
  { match: /knust|kwame nkrumah/i, lat: 6.6732, lng: -1.5717 },
  { match: /legon|university of ghana/i, lat: 5.6508, lng: -0.187 },
  { match: /cape coast|\bucc\b/i, lat: 5.116, lng: -1.29 },
  { match: /maritime|\brmu\b/i, lat: 5.5936, lng: -0.0766 },
  { match: /winneba|\buew\b|education/i, lat: 5.3567, lng: -0.625 },
  { match: /gimpa/i, lat: 5.6469, lng: -0.1546 },
  { match: /upsa|professional studies/i, lat: 5.663, lng: -0.17 },
];

// Campus centre for a university name, or null if it isn't one we know.
export function getCampusCentre(university) {
  const c = CAMPUS_CENTRES.find((x) => x.match.test(university || ""));
  return c ? { lat: c.lat, lng: c.lng } : null;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getListingCoords(listing) {
  if (listing.lat != null && listing.lat !== "" && listing.lng != null && listing.lng !== "") {
    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, approx: false };
  }
  const centre = CAMPUS_CENTRES.find((c) => c.match.test(listing.university || ""));
  if (!centre) return null;

  // Deterministic scatter 150–800 m from the campus centre, so a listing keeps
  // the same pin between visits.
  const seed = hashString(String(listing.id ?? listing.name));
  const angle = ((seed % 360) * Math.PI) / 180;
  const radius = 150 + (Math.floor(seed / 360) % 650);
  const dLat = (radius * Math.sin(angle)) / 111320;
  const dLng = (radius * Math.cos(angle)) / (111320 * Math.cos((centre.lat * Math.PI) / 180));
  return { lat: centre.lat + dLat, lng: centre.lng + dLng, approx: true };
}
