// EXPO_PUBLIC_-prefixed vars are inlined by Metro at build time from .env.
// Never hardcode the key here: .env holds the real value locally and is
// gitignored.
const API_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
if (!API_KEY) {
  console.warn('[placesApi] EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set, Kip\'s Favs will not return results. Add it to your .env file.');
}

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.id,places.displayName,places.rating,places.priceLevel,places.formattedAddress,places.photos';

export type PlacesCategory = 'restaurants' | 'attractions' | 'cheap_eats' | 'photo_spots';

export type PlaceResult = {
  id: string;
  name: string;
  rating: number | null;
  priceLevel: number | null;
  address: string | null;
  photoUrl: string | null;
  mapsUrl: string;
};

export type PlacesError  = { kind: 'error'; status: number; message: string };
export type PlacesSuccess = { kind: 'ok'; places: PlaceResult[] };
export type PlacesFetchResult = PlacesSuccess | PlacesError;

export const PLACES_QUERIES: Record<PlacesCategory, (dest: string) => string> = {
  restaurants: (dest) => `top restaurants in ${dest}`,
  attractions: (dest) => `top attractions in ${dest}`,
  cheap_eats:  (dest) => `cheap eats in ${dest}`,
  photo_spots: (dest) => `best photo spots in ${dest}`,
};

export const CATEGORY_LABELS: Record<PlacesCategory, string> = {
  restaurants: 'Top Restaurants',
  attractions: 'Top Attractions',
  cheap_eats:  'Cheap Eats',
  photo_spots: 'Best Photo Spots',
};

export const ALL_CATEGORIES: PlacesCategory[] = ['restaurants', 'attractions', 'cheap_eats', 'photo_spots'];
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PRICE_LEVEL_MAP: Record<string, number> = {
  FREE:           0,
  INEXPENSIVE:    1,
  MODERATE:       2,
  EXPENSIVE:      3,
  VERY_EXPENSIVE: 4,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlaces(raw: any[]): PlaceResult[] {
  return raw.map((p): PlaceResult => {
    const name    = (p.displayName?.text as string | undefined) ?? '';
    const address = (p.formattedAddress as string | undefined) ?? null;
    const priceLevelStr = p.priceLevel as string | undefined;
    const priceLevel = priceLevelStr
      ? (PRICE_LEVEL_MAP[priceLevelStr.replace('PRICE_LEVEL_', '')] ?? null)
      : null;
    const photoName = (p.photos?.[0]?.name) as string | undefined;
    const photoUrl  = photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${API_KEY}`
      : null;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((name + ' ' + (address ?? '')).trim())}`;
    return {
      id:         (p.id as string | undefined) ?? '',
      name,
      rating:     typeof p.rating === 'number' ? p.rating : null,
      priceLevel,
      address,
      photoUrl,
      mapsUrl,
    };
  });
}

/**
 * Typed fetch — returns { kind: 'error' } on auth/quota/network errors
 * so callers can distinguish "API broken" from "genuinely no results".
 * The console.warn lines print to Metro terminal for debugging.
 */
export async function fetchPlacesRaw(destination: string, category: PlacesCategory): Promise<PlacesFetchResult> {
  const query = PLACES_QUERIES[category](destination);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;
    if (!response.ok) {
      const msg = data?.error?.message ?? `HTTP ${response.status}`;
      console.warn(`[placesApi] ${response.status} for "${query}":`, JSON.stringify(data));
      return { kind: 'error', status: response.status, message: msg };
    }
    if (!Array.isArray(data.places)) {
      console.log(`[placesApi] empty for "${query}". Full response:`, JSON.stringify(data));
      return { kind: 'ok', places: [] };
    }
    return { kind: 'ok', places: parsePlaces(data.places) };
  } catch (err) {
    console.warn(`[placesApi] network error for "${query}":`, err);
    return { kind: 'error', status: 0, message: String(err) };
  }
}

/** Convenience wrapper — returns [] on any error (used where callers don't need error detail). */
export async function fetchPlaces(destination: string, category: PlacesCategory): Promise<PlaceResult[]> {
  const result = await fetchPlacesRaw(destination, category);
  return result.kind === 'ok' ? result.places : [];
}
