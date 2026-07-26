"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type LocationMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (lat: number, lng: number) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google: any;
  }
}

const DEFAULT_CENTER = { lat: 54.5, lng: -3 }; // roughly the centre of the UK
const DEFAULT_ZOOM = 6;
const PIN_ZOOM = 15;

/**
 * "use client" — owns its own Google Maps JS API <Script> tag, scoped to
 * wherever this component is used (not the whole admin layout). Uses
 * classic google.maps.Marker (draggable) rather than AdvancedMarkerElement
 * — the latter needs a Cloud Console mapId, disproportionate setup for an
 * internal admin tool. Renders a graceful placeholder if the browser key
 * isn't configured, matching getStripeServerClient()'s not-configured
 * pattern elsewhere in this codebase.
 */
export function LocationMapPicker({
  latitude,
  longitude,
  onPositionChange,
}: LocationMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Handles navigating between two location pages, where the script tag is
  // already in the DOM from a previous mount and onLoad won't fire again.
  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.maps) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center =
      latitude != null && longitude != null
        ? { lat: latitude, lng: longitude }
        : DEFAULT_CENTER;
    const zoom = latitude != null && longitude != null ? PIN_ZOOM : DEFAULT_ZOOM;

    const map = new window.google.maps.Map(mapRef.current, { center, zoom });
    mapInstanceRef.current = map;

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: true,
    });
    markerRef.current = marker;

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) onPositionChange(pos.lat(), pos.lng());
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addListener("click", (e: any) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      onPositionChange(e.latLng.lat(), e.latLng.lng());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  // Recenter/move the marker when lat/lng change externally — e.g. after
  // an address-lookup geocode result updates the parent's state.
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (latitude == null || longitude == null) return;

    const pos = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(pos);
    mapInstanceRef.current.setCenter(pos);
    mapInstanceRef.current.setZoom(PIN_ZOOM);
  }, [latitude, longitude]);

  if (!apiKey) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border-hairline bg-border-hairline-2 text-center text-sm text-muted-dark">
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
      <div
        ref={mapRef}
        className="h-64 w-full rounded-lg border border-border-hairline"
      />
    </>
  );
}
