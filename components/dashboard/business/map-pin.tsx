"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

const icon = L.divIcon({
  className: "",
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#7B1FA2;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

/** Leaflet + OpenStreetMap map with a draggable pin. Loaded client-only via next/dynamic. */
export default function MapPin({ lat, lng, onChange, draggable = true }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void; draggable?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    marker.current = L.marker([lat, lng], { draggable, icon, keyboard: true, title: "Business location" }).addTo(map.current);
    marker.current.on("dragend", () => {
      const p = marker.current!.getLatLng();
      cb.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
    });
    map.current.on("click", (e: L.LeafletMouseEvent) => {
      if (!draggable) return;
      marker.current!.setLatLng(e.latlng);
      cb.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    const cur = marker.current.getLatLng();
    if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6) {
      marker.current.setLatLng([lat, lng]);
      map.current.setView([lat, lng], Math.max(map.current.getZoom(), 13));
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!marker.current) return;
    if (draggable) marker.current.dragging?.enable();
    else marker.current.dragging?.disable();
  }, [draggable]);

  return <div ref={el} className="h-72 w-full overflow-hidden rounded-lg border border-border" role="application" aria-label="Map. Drag the pin to your exact location." />;
}
