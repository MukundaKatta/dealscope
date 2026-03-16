/**
 * Rent Estimator
 *
 * Estimates market rent from comparable rentals using distance-weighted
 * similarity scoring. Integrates with Rentometer API when available.
 */

import type {
  Property,
  RentEstimate,
  ComparableRent,
} from "./types";

export interface RentometerConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface RentDataPoint {
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  latitude: number;
  longitude: number;
  propertyType?: string;
  listDate?: string;
}

/**
 * Estimate rent using comparable rental data points.
 * Uses an inverse-distance-weighted, feature-similarity approach.
 */
export function estimateRentFromComps(
  property: Property,
  comps: RentDataPoint[],
  maxComps = 10,
  maxDistanceMiles = 3
): RentEstimate {
  if (comps.length === 0) {
    return fallbackEstimate(property);
  }

  // Score and filter comps
  const scored = comps
    .map((comp) => {
      const distance = haversineDistance(
        property.latitude,
        property.longitude,
        comp.latitude,
        comp.longitude
      );
      if (distance > maxDistanceMiles) return null;

      const similarity = calculateSimilarity(property, comp, distance);
      return { comp, distance, similarity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxComps);

  if (scored.length === 0) {
    return fallbackEstimate(property);
  }

  // Weighted average rent
  let weightedSum = 0;
  let weightTotal = 0;
  const rents: number[] = [];

  for (const { comp, similarity } of scored) {
    // Adjust rent by square footage difference
    const sqftRatio =
      property.squareFeet > 0 && comp.squareFeet > 0
        ? property.squareFeet / comp.squareFeet
        : 1;
    const adjustedRent = comp.rent * Math.min(Math.max(sqftRatio, 0.7), 1.3);

    weightedSum += adjustedRent * similarity;
    weightTotal += similarity;
    rents.push(adjustedRent);
  }

  const estimatedRent = Math.round(weightedSum / weightTotal);

  // Confidence based on number and quality of comps
  const avgSimilarity =
    scored.reduce((s, c) => s + c.similarity, 0) / scored.length;
  const countFactor = Math.min(scored.length / 5, 1); // Max confidence with 5+ comps
  const confidence = Math.round(avgSimilarity * countFactor * 100) / 100;

  // Range from actual comp rents
  rents.sort((a, b) => a - b);
  const p25 = rents[Math.floor(rents.length * 0.25)] ?? estimatedRent * 0.9;
  const p75 =
    rents[Math.floor(rents.length * 0.75)] ?? estimatedRent * 1.1;

  const comparableRents: ComparableRent[] = scored.map(({ comp, distance, similarity }) => ({
    address: comp.address,
    rent: comp.rent,
    bedrooms: comp.bedrooms,
    bathrooms: comp.bathrooms,
    squareFeet: comp.squareFeet,
    distance: Math.round(distance * 100) / 100,
    similarity: Math.round(similarity * 100) / 100,
  }));

  return {
    estimatedRent,
    rentLow: Math.round(p25),
    rentHigh: Math.round(p75),
    confidence,
    comparableRents,
    rentPerSqFt:
      property.squareFeet > 0
        ? Math.round((estimatedRent / property.squareFeet) * 100) / 100
        : 0,
    source: "comp_analysis",
  };
}

/**
 * Calculate similarity score (0-1) between the subject property
 * and a comparable rental listing.
 */
function calculateSimilarity(
  subject: Property,
  comp: RentDataPoint,
  distanceMiles: number
): number {
  let score = 0;
  let maxScore = 0;

  // Bedroom match (weight: 30)
  maxScore += 30;
  const bedDiff = Math.abs(subject.bedrooms - comp.bedrooms);
  if (bedDiff === 0) score += 30;
  else if (bedDiff === 1) score += 20;
  else if (bedDiff === 2) score += 5;

  // Bathroom match (weight: 15)
  maxScore += 15;
  const bathDiff = Math.abs(subject.bathrooms - comp.bathrooms);
  if (bathDiff === 0) score += 15;
  else if (bathDiff <= 0.5) score += 12;
  else if (bathDiff <= 1) score += 8;
  else score += 3;

  // Square footage (weight: 20)
  maxScore += 20;
  if (subject.squareFeet > 0 && comp.squareFeet > 0) {
    const sqftRatio = Math.min(subject.squareFeet, comp.squareFeet) /
      Math.max(subject.squareFeet, comp.squareFeet);
    score += 20 * sqftRatio;
  } else {
    score += 10; // Neutral if unknown
  }

  // Distance (weight: 25) — closer is better
  maxScore += 25;
  if (distanceMiles <= 0.25) score += 25;
  else if (distanceMiles <= 0.5) score += 22;
  else if (distanceMiles <= 1) score += 18;
  else if (distanceMiles <= 2) score += 12;
  else score += 5;

  // Property type (weight: 10)
  maxScore += 10;
  if (
    comp.propertyType &&
    comp.propertyType === subject.propertyType
  ) {
    score += 10;
  } else {
    score += 4; // Partial credit
  }

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Fallback estimate when no comps are available.
 * Uses basic per-bedroom heuristics by property type.
 */
function fallbackEstimate(property: Property): RentEstimate {
  // Very rough national averages as fallback
  const baseRentPerBed: Record<string, number> = {
    single_family: 650,
    multi_family: 550,
    condo: 700,
    townhouse: 675,
    duplex: 575,
    triplex: 550,
    fourplex: 525,
    apartment: 600,
  };

  const perBed = baseRentPerBed[property.propertyType] ?? 600;
  const bedrooms = Math.max(property.bedrooms, 1);
  const base = perBed * bedrooms;

  // Adjust for square footage if known
  const sqftAdjust =
    property.squareFeet > 0 ? (property.squareFeet / (bedrooms * 500)) * 0.2 : 0;
  const estimated = Math.round(base * (1 + sqftAdjust));

  return {
    estimatedRent: estimated,
    rentLow: Math.round(estimated * 0.8),
    rentHigh: Math.round(estimated * 1.2),
    confidence: 0.15,
    comparableRents: [],
    rentPerSqFt:
      property.squareFeet > 0
        ? Math.round((estimated / property.squareFeet) * 100) / 100
        : 0,
    source: "fallback_estimate",
  };
}

/**
 * Fetch rent estimate from Rentometer API
 */
export async function fetchRentometerEstimate(
  address: string,
  bedrooms: number,
  bathrooms: number,
  config: RentometerConfig
): Promise<{
  median: number;
  mean: number;
  percentile25: number;
  percentile75: number;
  sampleSize: number;
} | null> {
  const baseUrl = config.baseUrl ?? "https://www.rentometer.com/api/v1";

  try {
    const params = new URLSearchParams({
      address,
      bedrooms: bedrooms.toString(),
      bathrooms: bathrooms.toString(),
    });

    const response = await fetch(`${baseUrl}/summary?${params}`, {
      headers: {
        "X-Api-Key": config.apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      median: number;
      mean: number;
      percentile_25: number;
      percentile_75: number;
      sample_size: number;
    };

    return {
      median: data.median,
      mean: data.mean,
      percentile25: data.percentile_25,
      percentile75: data.percentile_75,
      sampleSize: data.sample_size,
    };
  } catch {
    return null;
  }
}

// ---------- Geo Helpers ----------

/** Haversine distance in miles */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
