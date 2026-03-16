/**
 * Zillow Scanner
 *
 * Integrates with the Zillow API via RapidAPI to fetch property listings,
 * property details, and Zestimate data.
 */

import type { Property, PropertyType, ListingStatus } from "@dealscope/analyzer";

export interface ZillowConfig {
  rapidApiKey: string;
  host?: string;
}

const DEFAULT_HOST = "zillow-com1.p.rapidapi.com";

interface ZillowSearchParams {
  location: string; // ZIP, city, or address
  status?: "forSale" | "forRent" | "recentlySold";
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  homeType?: string;
  sort?: "newest" | "priceHigh" | "priceLow" | "beds" | "relevance";
  page?: number;
}

interface ZillowRawListing {
  zpid: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    neighborhood?: string;
    community?: string;
  };
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  lotAreaValue?: number;
  lotAreaUnit?: string;
  yearBuilt: number;
  homeType: string;
  homeStatus: string;
  daysOnZillow: number;
  zestimate?: number;
  rentZestimate?: number;
  latitude: number;
  longitude: number;
  imgSrc?: string;
  description?: string;
  taxAssessedValue?: number;
  propertyTaxRate?: number;
  monthlyHoaFee?: number;
  datePostedString?: string;
  dateSold?: string;
  lastSoldPrice?: number;
  county?: string;
}

interface ZillowSearchResponse {
  results: ZillowRawListing[];
  totalPages: number;
  totalResultCount: number;
}

/**
 * Search Zillow listings by location, price range, and filters.
 */
export async function searchListings(
  params: ZillowSearchParams,
  config: ZillowConfig
): Promise<{ properties: Property[]; totalCount: number; totalPages: number }> {
  const host = config.host ?? DEFAULT_HOST;

  const queryParams = new URLSearchParams({
    location: params.location,
    status_type: params.status ?? "forSale",
    ...(params.minPrice && { minPrice: params.minPrice.toString() }),
    ...(params.maxPrice && { maxPrice: params.maxPrice.toString() }),
    ...(params.minBeds && { bedsMin: params.minBeds.toString() }),
    ...(params.maxBeds && { bedsMax: params.maxBeds.toString() }),
    ...(params.minBaths && { bathsMin: params.minBaths.toString() }),
    ...(params.minSqft && { sqftMin: params.minSqft.toString() }),
    ...(params.maxSqft && { sqftMax: params.maxSqft.toString() }),
    ...(params.homeType && { home_type: params.homeType }),
    ...(params.sort && { sort: params.sort }),
    ...(params.page && { page: params.page.toString() }),
  });

  const response = await fetch(
    `https://${host}/propertyExtendedSearch?${queryParams}`,
    {
      headers: {
        "X-RapidAPI-Key": config.rapidApiKey,
        "X-RapidAPI-Host": host,
      },
    }
  );

  if (!response.ok) {
    throw new ZillowApiError(
      `Zillow API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data = (await response.json()) as ZillowSearchResponse;

  const properties = (data.results || []).map(mapZillowToProperty);

  return {
    properties,
    totalCount: data.totalResultCount || properties.length,
    totalPages: data.totalPages || 1,
  };
}

/**
 * Get detailed property info by Zillow Property ID (zpid).
 */
export async function getPropertyDetails(
  zpid: string,
  config: ZillowConfig
): Promise<Property | null> {
  const host = config.host ?? DEFAULT_HOST;

  const response = await fetch(
    `https://${host}/property?zpid=${zpid}`,
    {
      headers: {
        "X-RapidAPI-Key": config.rapidApiKey,
        "X-RapidAPI-Host": host,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new ZillowApiError(
      `Zillow API error: ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as ZillowRawListing;
  return mapZillowToProperty(data);
}

/**
 * Get comparable sales for a property.
 */
export async function getComparableSales(
  zpid: string,
  config: ZillowConfig
): Promise<Property[]> {
  const host = config.host ?? DEFAULT_HOST;

  const response = await fetch(
    `https://${host}/similarSales?zpid=${zpid}`,
    {
      headers: {
        "X-RapidAPI-Key": config.rapidApiKey,
        "X-RapidAPI-Host": host,
      },
    }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as { results: ZillowRawListing[] };
  return (data.results || []).map(mapZillowToProperty);
}

/**
 * Search recently sold properties in an area for comp analysis.
 */
export async function searchRecentlySold(
  location: string,
  daysBack: number,
  config: ZillowConfig
): Promise<Property[]> {
  const { properties } = await searchListings(
    {
      location,
      status: "recentlySold",
      sort: "newest",
    },
    config
  );

  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return properties.filter((p) => {
    if (!p.lastSoldDate) return true; // Include if no date
    return new Date(p.lastSoldDate).getTime() >= cutoff;
  });
}

/**
 * Get Zestimate and rent Zestimate for a property.
 */
export async function getZestimate(
  zpid: string,
  config: ZillowConfig
): Promise<{ zestimate: number; rentZestimate: number } | null> {
  const property = await getPropertyDetails(zpid, config);
  if (!property) return null;

  return {
    zestimate: property.zestimate ?? 0,
    rentZestimate: property.rentZestimate ?? 0,
  };
}

// ---------- Batch Operations ----------

/**
 * Scan multiple ZIP codes for listings matching criteria.
 */
export async function scanMarkets(
  zipCodes: string[],
  filters: Omit<ZillowSearchParams, "location">,
  config: ZillowConfig,
  options: { concurrency?: number; delayMs?: number } = {}
): Promise<Map<string, Property[]>> {
  const { concurrency = 3, delayMs = 500 } = options;
  const results = new Map<string, Property[]>();

  // Process in batches to respect rate limits
  for (let i = 0; i < zipCodes.length; i += concurrency) {
    const batch = zipCodes.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map((zip) =>
        searchListings({ ...filters, location: zip }, config)
      )
    );

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j]!;
      const zip = batch[j]!;
      if (result.status === "fulfilled") {
        results.set(zip, result.value.properties);
      } else {
        results.set(zip, []);
      }
    }

    // Rate limit delay between batches
    if (i + concurrency < zipCodes.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ---------- Mapping ----------

function mapZillowToProperty(raw: ZillowRawListing): Property {
  return {
    id: raw.zpid,
    address: raw.address.streetAddress,
    city: raw.address.city,
    state: raw.address.state,
    zipCode: raw.address.zipcode,
    county: raw.county ?? "",
    latitude: raw.latitude,
    longitude: raw.longitude,
    listPrice: raw.price,
    bedrooms: raw.bedrooms ?? 0,
    bathrooms: raw.bathrooms ?? 0,
    squareFeet: raw.livingArea ?? 0,
    lotSize: convertLotSize(raw.lotAreaValue, raw.lotAreaUnit),
    yearBuilt: raw.yearBuilt ?? 0,
    propertyType: mapHomeType(raw.homeType),
    status: mapStatus(raw.homeStatus),
    daysOnMarket: raw.daysOnZillow ?? 0,
    mlsNumber: undefined,
    description: raw.description,
    images: raw.imgSrc ? [raw.imgSrc] : [],
    features: [],
    taxAssessedValue: raw.taxAssessedValue,
    annualTaxes: raw.taxAssessedValue && raw.propertyTaxRate
      ? raw.taxAssessedValue * (raw.propertyTaxRate / 100)
      : undefined,
    hoaMonthly: raw.monthlyHoaFee,
    zestimate: raw.zestimate,
    rentZestimate: raw.rentZestimate,
    lastSoldDate: raw.dateSold,
    lastSoldPrice: raw.lastSoldPrice,
    source: "zillow",
    sourceUrl: `https://www.zillow.com/homedetails/${raw.zpid}_zpid/`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapHomeType(type: string): PropertyType {
  const mapping: Record<string, PropertyType> = {
    SINGLE_FAMILY: "single_family",
    MULTI_FAMILY: "multi_family",
    CONDO: "condo",
    TOWNHOUSE: "townhouse",
    APARTMENT: "apartment",
    MANUFACTURED: "mobile_home",
    LOT: "land",
  };
  return mapping[type] ?? "single_family";
}

function mapStatus(status: string): ListingStatus {
  const mapping: Record<string, ListingStatus> = {
    FOR_SALE: "active",
    PENDING: "pending",
    RECENTLY_SOLD: "sold",
    OFF_MARKET: "off_market",
    FORECLOSURE: "foreclosure",
    PRE_FORECLOSURE: "pre_foreclosure",
  };
  return mapping[status] ?? "active";
}

function convertLotSize(value?: number, unit?: string): number {
  if (!value) return 0;
  if (unit === "acres") return Math.round(value * 43560);
  return value; // Assume sqft
}

// ---------- Error ----------

export class ZillowApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ZillowApiError";
  }
}
