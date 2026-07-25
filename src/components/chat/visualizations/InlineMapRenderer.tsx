import React, { useEffect, useRef } from 'react';
import { MapPin, Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  popupContent?: string;
}

export interface InlineMapConfig {
  title?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  height?: number;
}

const InlineMapComponent: React.FC<InlineMapConfig> = ({
  title = 'Geospatial Location View',
  center = [-33.8688, 151.2093], // Default Sydney
  zoom = 12,
  markers = [],
  height = 240
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    // Trigger invalidateSize after initial layout render to prevent resize jumps
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []); // Run ONCE on mount

  // Update Map Markers & View Bounds without destroying Leaflet instance
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear existing markers safely
    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // Custom Map Pin Icon
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="background-color: #6366f1; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: customIcon });
      if (m.label || m.popupContent) {
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 2px;">
            <strong>${m.label || 'Location'}</strong>
            ${m.popupContent ? `<p style="margin-top:4px; margin-bottom:0;">${m.popupContent}</p>` : ''}
          </div>
        `);
      }
      marker.addTo(layerGroup);
      bounds.extend([m.lat, m.lng]);
    });

    if (markers.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView(center, zoom);
    }

    map.invalidateSize();
  }, [JSON.stringify(center), zoom, JSON.stringify(markers)]);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Compass className="h-4 w-4 text-emerald-400" />
          {title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-indigo-400" />
          <span>{markers.length} marker{markers.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full relative z-0" style={{ height }} />
    </div>
  );
};

// React.memo with custom comparison to prevent re-renders when user types in chat input
export const InlineMapRenderer = React.memo(InlineMapComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.height === nextProps.height &&
    prevProps.zoom === nextProps.zoom &&
    JSON.stringify(prevProps.center) === JSON.stringify(nextProps.center) &&
    JSON.stringify(prevProps.markers) === JSON.stringify(nextProps.markers)
  );
});
