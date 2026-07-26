// Pure, no secrets — safe to import from client components. Kept separate
// from geocode.ts (which references the server-only GOOGLE_MAPS_API_KEY)
// so importing this doesn't pull server-only code into the client bundle.

// Loose UK bounding box — used only for a non-blocking "does this look
// right" warning, not validation that rejects a save.
const UK_BOUNDS = { minLat: 49.8, maxLat: 60.9, minLng: -8.6, maxLng: 1.8 };

export function isWithinUkBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= UK_BOUNDS.minLat &&
    latitude <= UK_BOUNDS.maxLat &&
    longitude >= UK_BOUNDS.minLng &&
    longitude <= UK_BOUNDS.maxLng
  );
}

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance between two points, in miles. Used for the
 * "new business nearby" notification radius (Admin_Portal_Structure.docx
 * Section 8b, default 20 miles). */
export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}
