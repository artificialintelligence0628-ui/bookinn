// Shared BookInn design tokens.
//
// This used to live only in App.jsx, with AdminEmails.jsx importing it back
// out — a circular import (App.jsx -> AdminEmails.jsx -> App.jsx) that
// happened to build fine but broke at runtime: whichever module's top-level
// code ran first saw the other's exports as still-undefined. Living here,
// in a file neither of them needs anything back from, removes the cycle.
export const C = {
  navy: "#003580",      // header / deep brand blue
  blue: "#0071c2",      // primary CTA blue
  blueHover: "#00487a",
  blueLight: "#e6f2fb",  // light blue surfaces
  blueMist: "#f0f6fc",   // page background tint
  yellow: "#febb02",     // accent, used sparingly (save/featured)
  yellowDark: "#8a6300",
  green: "#008009",
  ink: "#1a1a1a",
  gray600: "#6b6b6b",
  gray400: "#98a2b3",
  border: "#e7edf3",
  white: "#ffffff",
};
