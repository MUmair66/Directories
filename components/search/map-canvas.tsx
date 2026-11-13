"use client";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { MapMarker } from "@/lib/search";

/** Marker with an optional short label (the result number) drawn inside the pin. */
export type PinMarker = MapMarker & { label?: string };

function pinIcon(active: boolean, label?: string) {
  const inner = label
    ? `<text x="14" y="17.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${label.length > 2 ? 8 : 10.5}" font-weight="700" fill="${active ? "#1E3A8A" : "#2563EB"}">${label}</text>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    html: `<svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true"><path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0Z" fill="${active ? "#1E3A8A" : "#2563EB"}"/><circle cx="14" cy="13.5" r="${label ? 8 : 5.5}" fill="#fff"/>${inner}</svg>`,
  });
}

function Markers({ markers, activeId, onSelect }: { markers: PinMarker[]; activeId: string | null; onSelect: (id: string) => void }) {
  const map = useMap();
  const group = useRef<L.MarkerClusterGroup | null>(null);
  const byId = useRef(new Map<string, { marker: L.Marker; label?: string }>());

  useEffect(() => {
    group.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) =>
        L.divIcon({ html: `<div>${cluster.getChildCount()}</div>`, className: "marker-cluster-brand", iconSize: L.point(40, 40) }),
    });
    map.addLayer(group.current);
    return () => {
      if (group.current) map.removeLayer(group.current);
    };
  }, [map]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    byId.current.clear();
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], { icon: pinIcon(false, m.label), title: m.label ? `${m.label}. ${m.name}` : m.name, keyboard: true });
      const rating = m.reviewCount ? `★ ${Number(m.avgRating).toFixed(1)} (${m.reviewCount})` : "No reviews yet";
      const popup = document.createElement("div");
      const link = document.createElement("a");
      link.href = `/biz/${m.slug}`;
      link.textContent = m.name;
      link.style.fontWeight = "600";
      const meta = document.createElement("div");
      meta.textContent = rating;
      meta.style.color = "#64748B";
      popup.append(link, meta);
      marker.bindPopup(popup);
      marker.on("click", () => onSelect(m.id));
      byId.current.set(m.id, { marker, label: m.label });
      g.addLayer(marker);
    }
  }, [markers, onSelect]);

  useEffect(() => {
    for (const [id, { marker, label }] of byId.current) {
      marker.setIcon(pinIcon(id === activeId, label));
      marker.setZIndexOffset(id === activeId ? 1000 : 0);
    }
  }, [activeId, markers]);

  return null;
}

function BoundsWatcher({ onMove }: { onMove: (bbox: string) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onMove([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(","));
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onMove([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Zooms the map to show every marker whenever the marker set changes. */
function FitToMarkers({ markers }: { markers: PinMarker[] }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(",");
  useEffect(() => {
    if (!markers.length) return;
    if (markers.length === 1) map.setView([markers[0]!.lat, markers[0]!.lng], 14);
    else map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])), { padding: [36, 36], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function MapCanvas({
  center,
  zoom,
  markers,
  activeId,
  onSelect,
  onMove,
  fitToMarkers = false,
}: {
  center: [number, number];
  zoom: number;
  markers: PinMarker[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Called with "west,south,east,north" after every pan/zoom (and once on mount). */
  onMove?: (bbox: string) => void;
  /** Fit the view to the markers instead of the fixed center/zoom (search split view). */
  fitToMarkers?: boolean;
}) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="size-full" aria-label="Map of results">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Markers markers={markers} activeId={activeId} onSelect={onSelect} />
      {onMove && <BoundsWatcher onMove={onMove} />}
      {fitToMarkers && <FitToMarkers markers={markers} />}
    </MapContainer>
  );
}
