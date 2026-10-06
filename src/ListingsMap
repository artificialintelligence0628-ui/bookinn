import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getListingCoords } from "./mapCoords.js";

// Price pins instead of default markers: nothing to load, and the price is
// readable straight off the map.
function pinIcon(listing, active) {
  const booked = listing.availability === "Fully booked";
  const bg = active ? "#003580" : booked ? "#eef1f4" : "#ffffff";
  const fg = active ? "#ffffff" : booked ? "#6b6b6b" : "#1a1a1a";
  const border = active ? "#003580" : booked ? "#c9d1d9" : "#0071c2";
  const price = `GH\u20B5${Math.round(Number(listing.price) || 0).toLocaleString()}`;
  return L.divIcon({
    className: "bk-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:absolute;left:0;top:0;transform:translate(-50%,-115%) scale(${active ? 1.08 : 1});transform-origin:50% 100%;white-space:nowrap;background:${bg};color:${fg};border:1.5px solid ${border};border-radius:999px;padding:4px 10px;font:700 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.22);cursor:pointer;">${price}</div>`,
  });
}

export default function ListingsMap({ listings, selectedId, hoverId, onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([7.9, -1.0], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on("click", () => onSelectRef.current(null));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markersRef.current = new Map();
    };
  }, []);

  // Rebuild pins whenever the (filtered) listings change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layerRef.current.clearLayers();
    markersRef.current = new Map();
    const points = [];
    listings.forEach((l) => {
      const c = getListingCoords(l);
      if (!c) return;
      const marker = L.marker([c.lat, c.lng], { icon: pinIcon(l, false), title: l.name, riseOnHover: true });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(l.id);
      });
      marker.addTo(layerRef.current);
      markersRef.current.set(l.id, { marker, listing: l });
      points.push([c.lat, c.lng]);
    });
    if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [listings]);

  // Highlight the hovered / selected pin.
  useEffect(() => {
    markersRef.current.forEach(({ marker, listing }, id) => {
      const active = id === selectedId || id === hoverId;
      marker.setIcon(pinIcon(listing, active));
      marker.setZIndexOffset(active ? 1000 : 0);
    });
  }, [selectedId, hoverId, listings]);

  // Pan to a pin picked from the list or a pin tap, without changing zoom.
  useEffect(() => {
    const entry = selectedId != null ? markersRef.current.get(selectedId) : null;
    if (entry && mapRef.current) mapRef.current.panTo(entry.marker.getLatLng(), { animate: true });
  }, [selectedId]);

  return <div ref={elRef} className="w-full h-full" role="region" aria-label="Map of listings" />;
}
