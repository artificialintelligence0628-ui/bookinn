import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// CSS-only pin so no default Leaflet marker images are needed in the bundle.
const pinIcon = L.divIcon({
  className: "bk-detail-pin",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  html: '<div style="position:absolute;left:0;top:0;width:32px;height:32px;margin-left:-16px;margin-top:-42px;background:#0071c2;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.4)"><div style="position:absolute;left:8px;top:8px;width:10px;height:10px;background:#fff;border-radius:50%"></div></div>',
});

// Small read-only map for one listing's detail page.
// lat/lng: the property's coordinates. exact=false means the position is only the
// campus area (the owner hasn't pinned the building), so the zoom is wider.
export default function ListingLocationMap({ lat, lng, name, exact = true }) {
  const elRef = useRef(null);

  useEffect(() => {
    const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([lat, lng], exact ? 17 : 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    if (exact) {
      L.marker([lat, lng], { icon: pinIcon, title: name, keyboard: false }).addTo(map);
    } else {
      L.circle([lat, lng], { radius: 500, color: "#0071c2", weight: 2, fillOpacity: 0.12 }).addTo(map);
    }
    // Two-finger pan on phones so the page can still scroll past the map.
    map.dragging[L.Browser.mobile ? "disable" : "enable"]();
    if (L.Browser.mobile) {
      map.getContainer().addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) map.dragging.enable();
      });
      map.getContainer().addEventListener("touchend", () => map.dragging.disable());
    }
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => { clearTimeout(t); map.remove(); };
  }, [lat, lng, exact, name]);

  return (
    <div
      ref={elRef}
      role="region"
      aria-label={`Map showing the location of ${name}`}
      style={{ height: 300, borderColor: "#d5dde6" }}
      className="w-full border rounded-lg overflow-hidden"
    />
  );
}
