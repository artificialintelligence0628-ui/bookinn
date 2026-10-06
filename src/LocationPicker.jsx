import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCampusCentre } from "./mapCoords.js";

// A plain CSS pin, so there are no default marker image files to break in the bundle.
const pinIcon = L.divIcon({
  className: "bk-picker-pin",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  html: '<div style="position:absolute;left:0;top:0;width:26px;height:26px;margin-left:-13px;margin-top:-34px;background:#0071c2;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"><div style="position:absolute;left:6px;top:6px;width:8px;height:8px;background:#fff;border-radius:50%"></div></div>',
});

// Lets an owner drop (or drag) a pin on the exact building.
// value: { lat, lng } | null   onChange: (value | null) => void
export default function LocationPicker({ value, onChange, university }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);

  const place = (lat, lng, pan = false) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      const m = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 17));
  };

  // Create the map once.
  useEffect(() => {
    const campus = getCampusCentre(university);
    const start = value ? [value.lat, value.lng] : campus ? [campus.lat, campus.lng] : [7.9, -1.0];
    const zoom = value ? 17 : campus ? 15 : 7;
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(start, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    map.on("click", (e) => {
      place(e.latlng.lat, e.latlng.lng);
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    if (value) place(value.lat, value.lng);
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in step when the value changes from outside (clear, edit another listing).
  useEffect(() => {
    if (!mapRef.current) return;
    if (!value) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      return;
    }
    place(value.lat, value.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  // Re-centre on the campus when the university changes and nothing is pinned yet.
  useEffect(() => {
    if (!mapRef.current || value) return;
    const campus = getCampusCentre(university);
    if (campus) mapRef.current.setView([campus.lat, campus.lng], 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [university]);

  const useMyLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("Your browser can't share its location. Tap the map instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        place(latitude, longitude, true);
        onChangeRef.current({ lat: latitude, lng: longitude });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location. Allow location access, or tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          style={{ borderColor: "#0071c2", color: "#0071c2" }}
          className="border rounded-md text-sm font-semibold px-3 h-9 bg-white hover:bg-blue-50 disabled:opacity-60"
        >
          {locating ? "Finding you…" : "Use my current location"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-semibold px-2 h-9 text-gray-600 hover:underline"
          >
            Remove pin
          </button>
        )}
      </div>
      <div
        ref={elRef}
        role="region"
        aria-label="Map to pin the property location"
        style={{ height: 280, borderColor: "#d5dde6" }}
        className="w-full border rounded-lg overflow-hidden"
      />
      <p className="text-xs mt-1.5" style={{ color: "#6b6b6b" }}>
        {geoError
          ? geoError
          : value
            ? "Pin placed. Drag it, or tap the map, to adjust."
            : "Tap the map where your building is. Zoom in for accuracy."}
      </p>
    </div>
  );
}
