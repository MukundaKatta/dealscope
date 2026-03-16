/**
 * MLS Data Integration
 *
 * Provides an abstraction layer for MLS (Multiple Listing Service) data.
 * Supports RESO (Real Estate Standards Organization) Web API format
 * and common MLS data feeds.
 */

import type { Property, PropertyType, ListingStatus, ComparableSale } from "@dealscope/analyzer";

export interface MLSConfig {
  baseUrl: string;
  apiKey: string;
  mlsId: string;
  format?: "reso" | "rets";
}

export interface MLSSearchParams {
  zipCodes?: string[];
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyTypes?: PropertyType[];
  status?: ListingStatus[];
  minListDate?: string;
  maxListDate?: string;
  modifiedSince?: string;
  limit?: number;
  offset?: number;
}

interface RESOListing {
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  ListPrice: number;
  OriginalListPrice: number;
  ClosePrice?: number;
  CloseDate?: string;
  ListDate: string;
  DaysOnMarket: number;
  StreetNumberNumeric?: number;
  StreetName?: string;
  StreetSuffix?: string;
  UnitNumber?: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  County?: string;
  Latitude?: number;
  Longitude?: number;
  BedroomsTotal: number;
  BathroomsTotalDecimal: number;
  LivingArea: number;
  LotSizeArea?: number;
  YearBuilt: number;
  PropertyType: string;
  PropertySubType?: string;
  TaxAnnualAmount?: number;
  TaxAssessedValue?: number;
  AssociationFee?: number;
  PublicRemarks?: string;
  Media?: Array<{ MediaURL: string; Order: number }>;
  InteriorFeatures?: string[];
  ExteriorFeatures?: string[];
  Appliances?: string[];
  Heating?: string[];
  Cooling?: string[];
  ParkingFeatures?: string[];
  ModificationTimestamp: string;
}

interface RESOSearchResponse {
  "@odata.count"?: number;
  value: RESOListing[];
}

/**
 * Search MLS listings using RESO Web API format.
 */
export async function searchMLSListings(
  params: MLSSearchParams,
  config: MLSConfig
): Promise<{ properties: Property[]; totalCount: number }> {
  const filterParts: string[] = [];

  if (params.zipCodes?.length) {
    const zipFilter = params.zipCodes
      .map((z) => `PostalCode eq '${z}'`)
      .join(" or ");
    filterParts.push(`(${zipFilter})`);
  }
  if (params.city) {
    filterParts.push(`City eq '${params.city}'`);
  }
  if (params.state) {
    filterParts.push(`StateOrProvince eq '${params.state}'`);
  }
  if (params.minPrice !== undefined) {
    filterParts.push(`ListPrice ge ${params.minPrice}`);
  }
  if (params.maxPrice !== undefined) {
    filterParts.push(`ListPrice le ${params.maxPrice}`);
  }
  if (params.minBeds !== undefined) {
    filterParts.push(`BedroomsTotal ge ${params.minBeds}`);
  }
  if (params.maxBeds !== undefined) {
    filterParts.push(`BedroomsTotal le ${params.maxBeds}`);
  }
  if (params.minBaths !== undefined) {
    filterParts.push(`BathroomsTotalDecimal ge ${params.minBaths}`);
  }
  if (params.minSqft !== undefined) {
    filterParts.push(`LivingArea ge ${params.minSqft}`);
  }
  if (params.maxSqft !== undefined) {
    filterParts.push(`LivingArea le ${params.maxSqft}`);
  }
  if (params.status?.length) {
    const statusFilter = params.status
      .map((s) => `StandardStatus eq '${mapStatusToRESO(s)}'`)
      .join(" or ");
    filterParts.push(`(${statusFilter})`);
  }
  if (params.modifiedSince) {
    filterParts.push(
      `ModificationTimestamp gt ${params.modifiedSince}`
    );
  }

  const searchParams = new URLSearchParams({
    $filter: filterParts.join(" and "),
    $top: (params.limit ?? 50).toString(),
    $skip: (params.offset ?? 0).toString(),
    $count: "true",
    $orderby: "ModificationTimestamp desc",
  });

  const response = await fetch(
    `${config.baseUrl}/Property?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        "X-MLS-ID": config.mlsId,
      },
    }
  );

  if (!response.ok) {
    throw new MLSApiError(
      `MLS API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data = (await response.json()) as RESOSearchResponse;

  return {
    properties: data.value.map(mapRESOToProperty),
    totalCount: data["@odata.count"] ?? data.value.length,
  };
}

/**
 * Get a single property by MLS listing key.
 */
export async function getMLSProperty(
  listingKey: string,
  config: MLSConfig
): Promise<Property | null> {
  const response = await fetch(
    `${config.baseUrl}/Property('${listingKey}')`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        "X-MLS-ID": config.mlsId,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new MLSApiError(`MLS API error: ${response.status}`, response.status);
  }

  const data = (await response.json()) as RESOListing;
  return mapRESOToProperty(data);
}

/**
 * Fetch recently sold properties for comp analysis.
 */
export async function getRecentSales(
  zipCode: string,
  daysBack: number,
  config: MLSConfig
): Promise<ComparableSale[]> {
  const cutoffDate = new Date(
    Date.now() - daysBack * 24 * 60 * 60 * 1000
  ).toISOString();

  const { properties } = await searchMLSListings(
    {
      zipCodes: [zipCode],
      status: ["sold"],
      modifiedSince: cutoffDate,
      limit: 100,
    },
    config
  );

  return properties
    .filter((p) => p.lastSoldPrice && p.lastSoldPrice > 0)
    .map((p) => ({
      address: `${p.address}, ${p.city}, ${p.state}`,
      salePrice: p.lastSoldPrice!,
      saleDate: p.lastSoldDate ?? new Date().toISOString(),
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      squareFeet: p.squareFeet,
      pricePerSqFt:
        p.squareFeet > 0
          ? Math.round((p.lastSoldPrice! / p.squareFeet) * 100) / 100
          : 0,
      distance: 0,
      similarity: 0,
      daysOnMarket: p.daysOnMarket,
      yearBuilt: p.yearBuilt,
    }));
}

/**
 * Subscribe to new listing notifications via MLS data feed.
 * Returns a polling function that checks for new/updated listings.
 */
export function createMLSPoller(
  params: MLSSearchParams,
  config: MLSConfig,
  intervalMs = 300000 // 5 minutes
): {
  start: (callback: (properties: Property[]) => void) => void;
  stop: () => void;
} {
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastCheck = new Date().toISOString();

  return {
    start(callback) {
      const poll = async () => {
        try {
          const { properties } = await searchMLSListings(
            { ...params, modifiedSince: lastCheck },
            config
          );
          lastCheck = new Date().toISOString();
          if (properties.length > 0) {
            callback(properties);
          }
        } catch (err) {
          console.error("[MLS Poller] Error:", err);
        }
      };

      // Initial poll
      poll();
      timer = setInterval(poll, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

// ---------- Mapping ----------

function mapRESOToProperty(listing: RESOListing): Property {
  const address = [
    listing.StreetNumberNumeric,
    listing.StreetName,
    listing.StreetSuffix,
  ]
    .filter(Boolean)
    .join(" ");

  const allFeatures = [
    ...(listing.InteriorFeatures ?? []),
    ...(listing.ExteriorFeatures ?? []),
    ...(listing.Appliances ?? []),
    ...(listing.Heating ?? []),
    ...(listing.Cooling ?? []),
    ...(listing.ParkingFeatures ?? []),
  ];

  return {
    id: listing.ListingKey,
    address: address || listing.ListingId,
    city: listing.City,
    state: listing.StateOrProvince,
    zipCode: listing.PostalCode,
    county: listing.County ?? "",
    latitude: listing.Latitude ?? 0,
    longitude: listing.Longitude ?? 0,
    listPrice: listing.ListPrice,
    bedrooms: listing.BedroomsTotal,
    bathrooms: listing.BathroomsTotalDecimal,
    squareFeet: listing.LivingArea ?? 0,
    lotSize: listing.LotSizeArea ?? 0,
    yearBuilt: listing.YearBuilt ?? 0,
    propertyType: mapRESOPropertyType(listing.PropertyType, listing.PropertySubType),
    status: mapRESOStatus(listing.StandardStatus),
    daysOnMarket: listing.DaysOnMarket,
    mlsNumber: listing.ListingId,
    description: listing.PublicRemarks,
    images: (listing.Media ?? [])
      .sort((a, b) => a.Order - b.Order)
      .map((m) => m.MediaURL),
    features: allFeatures,
    taxAssessedValue: listing.TaxAssessedValue,
    annualTaxes: listing.TaxAnnualAmount,
    hoaMonthly: listing.AssociationFee,
    lastSoldDate: listing.CloseDate,
    lastSoldPrice: listing.ClosePrice,
    source: "mls",
    createdAt: listing.ListDate,
    updatedAt: listing.ModificationTimestamp,
  };
}

function mapRESOPropertyType(
  type: string,
  subType?: string
): PropertyType {
  const sub = (subType ?? "").toLowerCase();
  if (sub.includes("duplex")) return "duplex";
  if (sub.includes("triplex")) return "triplex";
  if (sub.includes("quadruplex") || sub.includes("fourplex")) return "fourplex";

  const mapping: Record<string, PropertyType> = {
    Residential: "single_family",
    "Residential Income": "multi_family",
    Condominium: "condo",
    Townhouse: "townhouse",
    Land: "land",
    Commercial: "commercial",
    "Manufactured Home": "mobile_home",
  };
  return mapping[type] ?? "single_family";
}

function mapRESOStatus(status: string): ListingStatus {
  const mapping: Record<string, ListingStatus> = {
    Active: "active",
    Pending: "pending",
    Closed: "sold",
    Withdrawn: "off_market",
    Expired: "off_market",
    Canceled: "off_market",
    "Active Under Contract": "pending",
  };
  return mapping[status] ?? "active";
}

function mapStatusToRESO(status: ListingStatus): string {
  const mapping: Record<ListingStatus, string> = {
    active: "Active",
    pending: "Pending",
    sold: "Closed",
    off_market: "Withdrawn",
    foreclosure: "Active",
    auction: "Active",
    pre_foreclosure: "Active",
  };
  return mapping[status] ?? "Active";
}

export class MLSApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "MLSApiError";
  }
}
