// Server-only. Plain fetch to the Geocoding API REST endpoint — no
// @googlemaps/google-maps-services-js dependency needed for one endpoint.
// Mirrors src/lib/stripe-server.ts's pattern: returns a typed result
// instead of throwing when unconfigured, so callers can show a clear
// "not set up yet" state.

export type GeocodeResult =
  | {
      status: "ok";
      formattedAddress: string;
      latitude: number;
      longitude: number;
    }
  | { status: "not_found" }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { status: "not_configured" };
  }
  // TEMPORARY diagnostic — narrowing down a live "invalid API key" report.
  // Only the length and last 6 characters, never the full key, never
  // returned to the client — visible in Vercel's server logs only. Remove
  // once the root cause is confirmed.
  console.log(
    `[geocode diag] key length=${apiKey.length} tail=${apiKey.slice(-6)}`,
  );

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  // Soft regional bias, not a hard restriction — national/future
  // non-UK addresses shouldn't be rejected outright.
  url.searchParams.set("region", "uk");
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    return { status: "error", message: "Could not reach the Geocoding API." };
  }

  if (!response.ok) {
    return { status: "error", message: `Geocoding API returned ${response.status}.` };
  }

  const data = await response.json();

  if (data.status === "ZERO_RESULTS") {
    return { status: "not_found" };
  }

  if (data.status !== "OK" || !data.results?.[0]) {
    return {
      status: "error",
      message: data.error_message ?? `Geocoding API returned ${data.status}.`,
    };
  }

  const result = data.results[0];

  return {
    status: "ok",
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  };
}

