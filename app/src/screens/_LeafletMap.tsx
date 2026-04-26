// Web-only Leaflet map (loaded dynamically by MapScreen).
// We bring in Leaflet's CSS directly via require so the bundler ships it.

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Pin {
  id:    string;
  name:  string;
  hall:  string | null;
  stand: string | null;
  city:  string | null;
  lat:   number;
  lng:   number;
}

interface Props {
  pins:   Pin[];
  onPick: (companyId: string) => void;
}

// Default Leaflet marker icons reference assets via webpack — broken with
// Metro/Vercel paths. Use a CDN icon instead.
const ICON = L.icon({
  iconUrl:        'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

export function LeafletMap({ pins, onPick }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // Center on Milano (Fiera Milano Rho ≈ 45.516, 9.085).
    const map = L.map(ref.current).setView([45.4642, 9.19], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;

    // Group close-by markers using a feature group for now (cluster plugin
    // would be nicer but adds 70KB; FlatList of bounds works fine for ≤2000 pins).
    const group = L.featureGroup();
    for (const p of pins) {
      const marker = L.marker([p.lat, p.lng], { icon: ICON }).bindPopup(
        `<div style="font-family: -apple-system, system-ui, sans-serif; min-width:160px">
           <div style="font-weight:700; font-size:14px; margin-bottom:4px">${escapeHtml(p.name)}</div>
           <div style="font-size:12px; color:#64748B; margin-bottom:6px">
             ${[p.hall && 'Hall ' + p.hall, p.stand].filter(Boolean).join(' · ')}
             ${p.city ? '<br/>' + escapeHtml(p.city) : ''}
           </div>
           <a href="#" data-company="${p.id}" style="color:#3B82F6; font-size:12px; font-weight:600; text-decoration:none">Vezi card →</a>
         </div>`,
      );
      marker.addTo(group);
    }
    group.addTo(map);

    // Fit to all pins.
    try { map.fitBounds(group.getBounds(), { padding: [40, 40] }); } catch {}

    // Click handler on the popup link.
    map.on('popupopen', (e: any) => {
      const node = e.popup?._contentNode as HTMLElement | undefined;
      const a = node?.querySelector('a[data-company]') as HTMLAnchorElement | null;
      if (!a) return;
      a.onclick = (ev) => {
        ev.preventDefault();
        const id = a.dataset.company;
        if (id) onPick(id);
      };
    });

    return () => {
      group.remove();
    };
  }, [pins, onPick]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
