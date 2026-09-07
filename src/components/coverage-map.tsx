"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google: any;
  }
}

const DEFAULT_CENTER = { lat: 54.5, lng: -3 }; // roughly the centre of the UK
const DEFAULT_ZOOM = 6;
const MILES_TO_METRES = 1609.34;
const GOLD = "#e4bc50";
const TEAL = "#6fa7a1";

export type CoverageCircle = { id: string; label: string; latitude: number; longitude: number; radiusMiles: number };

/**
 * Zoomable UK map showing where sign-up is actually open (solid teal
 * circles, one per live_areas row) plus a live dashed-gold preview
 * circle for whichever business+radius is currently selected in the
 * create-area form above — so the founder can see exactly what an area
 * would cover, and spot gaps, before committing to it. Built 2026-09-06
 * per founder request while thinking through how to plan coverage
 * across several overlapping businesses.
 *
 * Same "use client" + <Script> + classic google.maps.* pattern as
 * location-map-picker.tsx (not AdvancedMarkerElement — no Cloud Console
 * mapId setup needed for an internal tool), using google.maps.Circle
 * instead of markers since a radius, not a pin, is the whole point here.
 */
export function CoverageMap({
  liveCircles,
  previewCircle,
}: {
  liveCircles: CoverageCircle[];
  previewCircle: { latitude: number; longitude: number; radiusMiles: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveCircleObjectsRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewCircleObjectRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.maps) {
      setScriptLoaded(true);
    }
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
  }, [scriptLoaded]);

  // Redraw live-area circles whenever the list changes.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    liveCircleObjectsRef.current.forEach((c) => c.setMap(null));
    liveCircleObjectsRef.current = liveCircles.map(
      (area) =>
        new window.google.maps.Circle({
          map: mapInstanceRef.current,
          center: { lat: area.latitude, lng: area.longitude },
          radius: area.radiusMiles * MILES_TO_METRES,
          strokeColor: TEAL,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: TEAL,
          fillOpacity: 0.15,
        }),
    );
  }, [scriptLoaded, liveCircles]);

  // Redraw the dashed preview circle whenever the selected business/radius
  // changes, and pan/zoom to it so a newly-picked business is visible
  // without the founder hunting for it on the map.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    previewCircleObjectRef.current?.setMap(null);
    previewCircleObjectRef.current = null;

    if (!previewCircle) return;

    previewCircleObjectRef.current = new window.google.maps.Circle({
      map: mapInstanceRef.current,
      center: { lat: previewCircle.latitude, lng: previewCircle.longitude },
      radius: previewCircle.radiusMiles * MILES_TO_METRES,
      strokeColor: GOLD,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      // Dashed via a symbol-based stroke pattern (Circle has no native
      // dashed option) — icons repeated along the path.
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
          offset: "0",
          repeat: "12px",
        },
      ],
      fillColor: GOLD,
      fillOpacity: 0.12,
    });

    mapInstanceRef.current.fitBounds(previewCircleObjectRef.current.getBounds());
  }, [scriptLoaded, previewCircle]);

  if (!apiKey) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-border-hairline bg-border-hairline-2 text-center text-sm text-muted-dark">
        Map unavailable — Google Maps API key not configured.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}`}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={mapRef} className="h-80 w-full rounded-lg border border-border-hairline" />
      <div className="mt-2 flex gap-4 text-xs text-muted-dark">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: TEAL }} />
          Live now
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: GOLD }} />
          Preview
        </span>
      </div>
    </>
  );
}
