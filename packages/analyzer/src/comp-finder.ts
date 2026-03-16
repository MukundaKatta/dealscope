/**
 * Comparable Sales Finder
 *
 * Finds and ranks comparable recently-sold properties using
 * multi-factor similarity scoring for accurate property valuation.
 */

import type { Property, ComparableSale } from "./types";

export interface CompSearchCriteria {
  maxDistanceMiles: number;
  maxAgeDays: number;
  minSimilarity: number;
  maxResults: number;
  bedroomRange: number; // +/- from subject
  bathroomRange: number;
  sqftVariancePercent: number; // e.g., 20 = within 20%
  samePropertyType: boolean;
}

export const DEFAULT_COMP_CRITERIA: CompSearchCriteria = {
  maxDistanceMiles: 1.5,
  maxAgeDays: 180,
  minSimilarity: 0.35,
  maxResults: 15,
  bedroomRange: 1,
  bathroomRange: 1,
  sqftVariancePercent: 25,
  samePropertyType: false,
};

export interface SoldProperty {
  address: string;
  salePrice: number;
  saleDate: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  lotSize: number;
  yearBuilt: number;
  propertyType: string;
  latitude: number;
  longitude: number;
  daysOnMarket: number;
  condition?: string;
}

/**
 * Find and rank comparable sales from a pool of sold properties.
 */
export function findComparableSales(
  subject: Property,
  soldProperties: SoldProperty[],
  criteria: CompSearchCriteria = DEFAULT_COMP_CRITERIA
): ComparableSale[] {
  const now = Date.now();

  const candidates = soldProperties
    .map((sold) => {
      // Distance filter
      const distance = haversineDistance(
        subject.latitude,
        subject.longitude,
        sold.latitude,
        sold.longitude
      );
      if (distance > criteria.maxDistanceMiles) return null;

      // Age filter
      const saleDate = new Date(sold.saleDate).getTime();
      const ageDays = (now - saleDate) / (1000 * 60 * 60 * 24);
      if (ageDays > criteria.maxAgeDays) return null;

      // Bedroom filter
      if (
        Math.abs(subject.bedrooms - sold.bedrooms) > criteria.bedroomRange
      ) return null;

      // Bathroom filter
      if (
        Math.abs(subject.bathrooms - sold.bathrooms) > criteria.bathroomRange
      ) return null;

      // Square footage filter
      if (subject.squareFeet > 0 && sold.squareFeet > 0) {
        const variance =
          Math.abs(subject.squareFeet - sold.squareFeet) / subject.squareFeet;
        if (variance > criteria.sqftVariancePercent / 100) return null;
      }

      // Property type filter
      if (
        criteria.samePropertyType &&
        sold.propertyType !== subject.propertyType
      ) return null;

      // Calculate similarity
      const similarity = calculateCompSimilarity(
        subject,
        sold,
        distance,
        ageDays
      );

      if (similarity < criteria.minSimilarity) return null;

      return {
        sold,
        distance,
        similarity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, criteria.maxResults);

  return candidates.map(({ sold, distance, similarity }) => ({
    address: sold.address,
    salePrice: sold.salePrice,
    saleDate: sold.saleDate,
    bedrooms: sold.bedrooms,
    bathrooms: sold.bathrooms,
    squareFeet: sold.squareFeet,
    pricePerSqFt:
      sold.squareFeet > 0
        ? Math.round((sold.salePrice / sold.squareFeet) * 100) / 100
        : 0,
    distance: Math.round(distance * 100) / 100,
    similarity: Math.round(similarity * 100) / 100,
    daysOnMarket: sold.daysOnMarket,
    yearBuilt: sold.yearBuilt,
  }));
}

/**
 * Estimate After Repair Value (ARV) from comparable sales
 */
export function estimateARV(
  subject: Property,
  comps: ComparableSale[]
): {
  estimatedValue: number;
  pricePerSqFt: number;
  confidence: number;
  adjustedComps: AdjustedComp[];
} {
  if (comps.length === 0) {
    return {
      estimatedValue: subject.listPrice,
      pricePerSqFt: subject.squareFeet > 0 ? subject.listPrice / subject.squareFeet : 0,
      confidence: 0,
      adjustedComps: [],
    };
  }

  const adjustedComps = comps.map((comp) => {
    let adjustedPrice = comp.salePrice;
    const adjustments: PriceAdjustment[] = [];

    // Square footage adjustment
    if (subject.squareFeet > 0 && comp.squareFeet > 0) {
      const sqftDiff = subject.squareFeet - comp.squareFeet;
      const pricePerSqFt = comp.salePrice / comp.squareFeet;
      // Use 50% of price/sqft for marginal sqft difference
      const sqftAdj = sqftDiff * pricePerSqFt * 0.5;
      adjustedPrice += sqftAdj;
      adjustments.push({
        factor: "Square Footage",
        amount: Math.round(sqftAdj),
        description: `${sqftDiff > 0 ? "+" : ""}${sqftDiff} sqft`,
      });
    }

    // Bedroom adjustment
    const bedDiff = subject.bedrooms - comp.bedrooms;
    if (bedDiff !== 0) {
      const bedAdj = bedDiff * 15000; // ~$15k per bedroom
      adjustedPrice += bedAdj;
      adjustments.push({
        factor: "Bedrooms",
        amount: Math.round(bedAdj),
        description: `${bedDiff > 0 ? "+" : ""}${bedDiff} bed`,
      });
    }

    // Bathroom adjustment
    const bathDiff = subject.bathrooms - comp.bathrooms;
    if (bathDiff !== 0) {
      const bathAdj = bathDiff * 10000; // ~$10k per bathroom
      adjustedPrice += bathAdj;
      adjustments.push({
        factor: "Bathrooms",
        amount: Math.round(bathAdj),
        description: `${bathDiff > 0 ? "+" : ""}${bathDiff} bath`,
      });
    }

    // Age/condition adjustment
    const ageDiff = (comp.yearBuilt || 2000) - (subject.yearBuilt || 2000);
    if (Math.abs(ageDiff) > 5) {
      const ageAdj = ageDiff * 500; // Newer = higher value
      adjustedPrice += ageAdj;
      adjustments.push({
        factor: "Age",
        amount: Math.round(ageAdj),
        description: `Comp is ${Math.abs(ageDiff)} years ${ageDiff > 0 ? "newer" : "older"}`,
      });
    }

    return {
      comp,
      adjustedPrice: Math.round(adjustedPrice),
      adjustments,
      weight: comp.similarity,
    };
  });

  // Weighted average of adjusted prices
  let weightedSum = 0;
  let weightTotal = 0;
  for (const ac of adjustedComps) {
    weightedSum += ac.adjustedPrice * ac.weight;
    weightTotal += ac.weight;
  }

  const estimatedValue = Math.round(weightedSum / weightTotal);
  const avgSimilarity =
    comps.reduce((sum, c) => sum + c.similarity, 0) / comps.length;
  const countFactor = Math.min(comps.length / 5, 1);
  const confidence = Math.round(avgSimilarity * countFactor * 100) / 100;

  return {
    estimatedValue,
    pricePerSqFt:
      subject.squareFeet > 0
        ? Math.round((estimatedValue / subject.squareFeet) * 100) / 100
        : 0,
    confidence,
    adjustedComps,
  };
}

export interface AdjustedComp {
  comp: ComparableSale;
  adjustedPrice: number;
  adjustments: PriceAdjustment[];
  weight: number;
}

export interface PriceAdjustment {
  factor: string;
  amount: number;
  description: string;
}

// ---------- Similarity Scoring ----------

function calculateCompSimilarity(
  subject: Property,
  comp: SoldProperty,
  distanceMiles: number,
  ageDays: number
): number {
  let score = 0;
  let maxScore = 0;

  // Location proximity (weight: 25)
  maxScore += 25;
  if (distanceMiles <= 0.25) score += 25;
  else if (distanceMiles <= 0.5) score += 22;
  else if (distanceMiles <= 0.75) score += 18;
  else if (distanceMiles <= 1.0) score += 14;
  else score += Math.max(0, 25 - distanceMiles * 12);

  // Recency (weight: 15)
  maxScore += 15;
  if (ageDays <= 30) score += 15;
  else if (ageDays <= 60) score += 13;
  else if (ageDays <= 90) score += 11;
  else if (ageDays <= 120) score += 8;
  else score += Math.max(0, 15 - ageDays * 0.06);

  // Bedrooms (weight: 20)
  maxScore += 20;
  const bedDiff = Math.abs(subject.bedrooms - comp.bedrooms);
  score += bedDiff === 0 ? 20 : bedDiff === 1 ? 12 : 4;

  // Bathrooms (weight: 10)
  maxScore += 10;
  const bathDiff = Math.abs(subject.bathrooms - comp.bathrooms);
  score += bathDiff === 0 ? 10 : bathDiff <= 0.5 ? 8 : bathDiff <= 1 ? 6 : 2;

  // Square footage (weight: 15)
  maxScore += 15;
  if (subject.squareFeet > 0 && comp.squareFeet > 0) {
    const ratio =
      Math.min(subject.squareFeet, comp.squareFeet) /
      Math.max(subject.squareFeet, comp.squareFeet);
    score += 15 * ratio;
  } else {
    score += 7;
  }

  // Year built (weight: 5)
  maxScore += 5;
  const yearDiff = Math.abs(
    (subject.yearBuilt || 2000) - (comp.yearBuilt || 2000)
  );
  if (yearDiff <= 3) score += 5;
  else if (yearDiff <= 10) score += 3;
  else score += 1;

  // Property type (weight: 10)
  maxScore += 10;
  score += comp.propertyType === subject.propertyType ? 10 : 3;

  return maxScore > 0 ? score / maxScore : 0;
}

// ---------- Geo ----------

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
