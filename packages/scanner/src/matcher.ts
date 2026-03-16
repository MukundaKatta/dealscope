/**
 * Deal Matcher
 *
 * Matches incoming property listings against user-defined investment
 * criteria and generates deal alerts when matches are found.
 */

import type {
  Property,
  InvestmentCriteria,
  DealAlert,
  DealScore,
  UnderwritingResult,
} from "@dealscope/analyzer";

export interface MatchResult {
  property: Property;
  criteria: InvestmentCriteria;
  matchScore: number; // 0-100 how well it matches criteria
  matchReasons: string[];
  dealScore?: DealScore;
  underwriting?: UnderwritingResult;
}

/**
 * Match a single property against a set of investment criteria.
 * Returns null if the property does not meet the criteria.
 */
export function matchProperty(
  property: Property,
  criteria: InvestmentCriteria
): MatchResult | null {
  const reasons: string[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // Price range (required)
  totalWeight += 20;
  if (
    property.listPrice >= criteria.minPrice &&
    property.listPrice <= criteria.maxPrice
  ) {
    earnedWeight += 20;
    reasons.push(
      `Price $${property.listPrice.toLocaleString()} within range ($${criteria.minPrice.toLocaleString()}-$${criteria.maxPrice.toLocaleString()})`
    );
  } else {
    // Hard filter — property must be in price range
    return null;
  }

  // Property type (required if specified)
  totalWeight += 15;
  if (criteria.propertyTypes.length === 0) {
    earnedWeight += 15; // No preference = all accepted
  } else if (criteria.propertyTypes.includes(property.propertyType)) {
    earnedWeight += 15;
    reasons.push(`Property type (${formatType(property.propertyType)}) matches`);
  } else {
    return null; // Hard filter
  }

  // Bedrooms
  totalWeight += 10;
  if (
    property.bedrooms >= criteria.minBedrooms &&
    property.bedrooms <= criteria.maxBedrooms
  ) {
    earnedWeight += 10;
    reasons.push(`${property.bedrooms} bedrooms in range`);
  } else {
    return null; // Hard filter
  }

  // Target markets / location
  totalWeight += 15;
  if (criteria.targetMarkets.length === 0) {
    earnedWeight += 15;
  } else if (criteria.targetMarkets.includes(property.zipCode)) {
    earnedWeight += 15;
    reasons.push(`Located in target market (${property.zipCode})`);
  } else {
    // Check distance — soft filter
    // Without actual geocoding for other zips, check city/state matching
    earnedWeight += 5; // Partial credit for being in dataset
  }

  // Days on market
  totalWeight += 10;
  if (
    criteria.maxDaysOnMarket === 0 ||
    property.daysOnMarket <= criteria.maxDaysOnMarket
  ) {
    earnedWeight += 10;
    if (property.daysOnMarket > 0) {
      reasons.push(`${property.daysOnMarket} days on market`);
    }
  } else {
    earnedWeight += 3; // Soft filter, partial credit
  }

  // Keywords
  totalWeight += 10;
  const description = (property.description ?? "").toLowerCase();
  const features = property.features.map((f) => f.toLowerCase()).join(" ");
  const searchText = `${description} ${features} ${property.address.toLowerCase()}`;

  let keywordMatches = 0;
  for (const keyword of criteria.keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      keywordMatches++;
      reasons.push(`Matches keyword: "${keyword}"`);
    }
  }
  if (criteria.keywords.length > 0) {
    earnedWeight += (keywordMatches / criteria.keywords.length) * 10;
  } else {
    earnedWeight += 10;
  }

  // Exclude keywords
  for (const exclude of criteria.excludeKeywords) {
    if (searchText.includes(exclude.toLowerCase())) {
      return null; // Hard exclude
    }
  }

  // Quick cash flow check (1% rule proxy)
  totalWeight += 10;
  if (property.rentZestimate) {
    const rentToPrice = (property.rentZestimate / property.listPrice) * 100;
    if (rentToPrice >= 0.8) {
      earnedWeight += 10;
      reasons.push(
        `Rent-to-price ratio: ${rentToPrice.toFixed(2)}% (${
          rentToPrice >= 1 ? "meets" : "near"
        } 1% rule)`
      );
    } else {
      earnedWeight += 3;
    }
  } else {
    earnedWeight += 5; // No data, neutral
  }

  // Listing freshness bonus
  totalWeight += 10;
  if (property.daysOnMarket <= 3) {
    earnedWeight += 10;
    reasons.push("New listing (just posted)");
  } else if (property.daysOnMarket <= 7) {
    earnedWeight += 8;
    reasons.push("Recent listing (this week)");
  } else if (property.daysOnMarket <= 14) {
    earnedWeight += 5;
  } else {
    earnedWeight += 2;
  }

  const matchScore = Math.round((earnedWeight / totalWeight) * 100);

  // Must meet minimum score to be a match
  if (matchScore < 50) return null;

  return {
    property,
    criteria,
    matchScore,
    matchReasons: reasons,
  };
}

/**
 * Match multiple properties against a single criteria.
 */
export function matchPropertiesAgainstCriteria(
  properties: Property[],
  criteria: InvestmentCriteria
): MatchResult[] {
  return properties
    .map((p) => matchProperty(p, criteria))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Match a single property against multiple criteria sets.
 */
export function matchPropertyAgainstAllCriteria(
  property: Property,
  criteriaList: InvestmentCriteria[]
): MatchResult[] {
  return criteriaList
    .map((c) => matchProperty(property, c))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Process a batch of new listings against all users' criteria.
 * Returns alerts grouped by user.
 */
export function processDealAlerts(
  newListings: Property[],
  allCriteria: InvestmentCriteria[]
): Map<string, DealAlert[]> {
  const alertsByUser = new Map<string, DealAlert[]>();

  // Only active criteria
  const activeCriteria = allCriteria.filter((c) => c.alertEnabled);

  for (const listing of newListings) {
    for (const criteria of activeCriteria) {
      const match = matchProperty(listing, criteria);
      if (!match) continue;

      const alert: DealAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: criteria.userId,
        criteriaId: criteria.id,
        propertyId: listing.id,
        dealScore: match.matchScore,
        matchReasons: match.matchReasons,
        status: "new",
        notifiedVia: [],
        createdAt: new Date().toISOString(),
      };

      const existing = alertsByUser.get(criteria.userId) ?? [];
      existing.push(alert);
      alertsByUser.set(criteria.userId, existing);
    }
  }

  return alertsByUser;
}

/**
 * Rank a list of matches to find the best deals.
 */
export function rankDeals(matches: MatchResult[]): MatchResult[] {
  return [...matches].sort((a, b) => {
    // Primary: deal score (if available)
    if (a.dealScore && b.dealScore) {
      const scoreDiff = b.dealScore.overall - a.dealScore.overall;
      if (Math.abs(scoreDiff) > 5) return scoreDiff;
    }

    // Secondary: match score
    const matchDiff = b.matchScore - a.matchScore;
    if (Math.abs(matchDiff) > 10) return matchDiff;

    // Tertiary: cash flow (if underwriting available)
    if (a.underwriting && b.underwriting) {
      return (
        b.underwriting.cashFlow.monthlyAfterDebt -
        a.underwriting.cashFlow.monthlyAfterDebt
      );
    }

    return matchDiff;
  });
}

/**
 * Deduplicate properties that appear from multiple sources.
 */
export function deduplicateProperties(properties: Property[]): Property[] {
  const seen = new Map<string, Property>();

  for (const prop of properties) {
    // Normalize address for deduplication
    const key = normalizeAddress(prop.address, prop.zipCode);

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, prop);
    } else {
      // Keep the one with more data
      const existingScore = dataQualityScore(existing);
      const newScore = dataQualityScore(prop);
      if (newScore > existingScore) {
        seen.set(key, prop);
      }
    }
  }

  return Array.from(seen.values());
}

function normalizeAddress(address: string, zipCode: string): string {
  return `${address.toLowerCase().replace(/[^a-z0-9]/g, "")}_${zipCode}`;
}

function dataQualityScore(prop: Property): number {
  let score = 0;
  if (prop.squareFeet > 0) score += 2;
  if (prop.yearBuilt > 0) score += 1;
  if (prop.description) score += 1;
  if (prop.images.length > 0) score += prop.images.length;
  if (prop.zestimate) score += 2;
  if (prop.rentZestimate) score += 3;
  if (prop.annualTaxes) score += 1;
  if (prop.features.length > 0) score += 1;
  if (prop.latitude !== 0) score += 1;
  return score;
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
