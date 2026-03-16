/** Core property and analysis types for DealScope */

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  listPrice: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  lotSize: number; // sq ft
  yearBuilt: number;
  propertyType: PropertyType;
  status: ListingStatus;
  daysOnMarket: number;
  mlsNumber?: string;
  description?: string;
  images: string[];
  features: string[];
  taxAssessedValue?: number;
  annualTaxes?: number;
  hoaMonthly?: number;
  zestimate?: number;
  rentZestimate?: number;
  lastSoldDate?: string;
  lastSoldPrice?: number;
  source: DataSource;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyType =
  | "single_family"
  | "multi_family"
  | "condo"
  | "townhouse"
  | "duplex"
  | "triplex"
  | "fourplex"
  | "apartment"
  | "commercial"
  | "land"
  | "mobile_home";

export type ListingStatus =
  | "active"
  | "pending"
  | "sold"
  | "off_market"
  | "foreclosure"
  | "auction"
  | "pre_foreclosure";

export type DataSource = "zillow" | "mls" | "redfin" | "realtor" | "manual";

export interface FinancingAssumptions {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  closingCostPercent: number;
  rehabBudget: number;
  afterRepairValue?: number;
}

export interface ExpenseAssumptions {
  propertyTaxRate: number; // annual, percent of value
  insuranceAnnual: number;
  maintenancePercent: number; // of gross rent
  vacancyPercent: number;
  propertyManagementPercent: number;
  capexReservePercent: number; // of gross rent
  hoaMonthly: number;
  utilitiesMonthly: number;
  otherMonthly: number;
}

export interface RentEstimate {
  estimatedRent: number;
  rentLow: number;
  rentHigh: number;
  confidence: number; // 0-1
  comparableRents: ComparableRent[];
  rentPerSqFt: number;
  source: string;
}

export interface ComparableRent {
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  distance: number; // miles
  similarity: number; // 0-1
}

export interface ComparableSale {
  address: string;
  salePrice: number;
  saleDate: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  pricePerSqFt: number;
  distance: number;
  similarity: number;
  daysOnMarket: number;
  yearBuilt: number;
}

export interface UnderwritingResult {
  property: Property;
  financing: FinancingAssumptions;
  expenses: ExpenseAssumptions;
  rentEstimate: RentEstimate;

  // Purchase metrics
  totalInvestment: number;
  downPayment: number;
  closingCosts: number;
  loanAmount: number;
  monthlyMortgage: number;

  // Income
  grossMonthlyRent: number;
  effectiveGrossIncome: number; // after vacancy
  annualGrossIncome: number;

  // Expenses
  totalMonthlyExpenses: number;
  totalAnnualExpenses: number;
  expenseBreakdown: ExpenseBreakdown;

  // Returns
  netOperatingIncome: number; // annual
  cashFlow: CashFlowResult;
  capRate: number;
  cashOnCashReturn: number;
  grossRentMultiplier: number;
  debtServiceCoverageRatio: number;
  breakEvenRatio: number;
  pricePerUnit: number;
  pricePerSqFt: number;
  rentToPrice: number; // 1% rule check

  // Projections
  fiveYearProjection: YearProjection[];
  internalRateOfReturn: number;
  totalReturnOnInvestment: number;
}

export interface ExpenseBreakdown {
  mortgage: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  vacancy: number;
  propertyManagement: number;
  capexReserve: number;
  hoa: number;
  utilities: number;
  other: number;
}

export interface CashFlowResult {
  monthlyPreTax: number;
  annualPreTax: number;
  monthlyAfterDebt: number;
  annualAfterDebt: number;
}

export interface YearProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualRent: number;
  annualExpenses: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  totalReturn: number;
  cashOnCash: number;
}

export interface DealScore {
  overall: number; // 1-100
  cashFlowScore: number;
  appreciationScore: number;
  riskScore: number;
  locationScore: number;
  conditionScore: number;
  marketScore: number;
  grade: DealGrade;
  summary: string;
  pros: string[];
  cons: string[];
  recommendation: DealRecommendation;
}

export type DealGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
export type DealRecommendation = "strong_buy" | "buy" | "hold" | "pass" | "avoid";

export interface MarketData {
  zipCode: string;
  city: string;
  state: string;
  medianHomePrice: number;
  medianRent: number;
  priceToRentRatio: number;
  yearOverYearAppreciation: number;
  populationGrowth: number;
  medianHouseholdIncome: number;
  unemploymentRate: number;
  crimeIndex: number;
  schoolRating: number;
  walkScore: number;
  inventoryMonths: number;
  daysOnMarketMedian: number;
  listToSaleRatio: number;
  foreclosureRate: number;
  newConstructionPermits: number;
  rentGrowthYoY: number;
  marketTemperature: MarketTemperature;
}

export type MarketTemperature = "hot" | "warm" | "neutral" | "cool" | "cold";

export interface InvestmentCriteria {
  id: string;
  userId: string;
  name: string;
  propertyTypes: PropertyType[];
  minPrice: number;
  maxPrice: number;
  minBedrooms: number;
  maxBedrooms: number;
  minCashOnCash: number;
  minCapRate: number;
  maxDaysOnMarket: number;
  minDealScore: number;
  targetMarkets: string[]; // ZIP codes
  maxDistance: number; // miles from target
  keywords: string[];
  excludeKeywords: string[];
  alertEnabled: boolean;
  alertFrequency: "instant" | "daily" | "weekly";
  createdAt: string;
  updatedAt: string;
}

export interface DealAlert {
  id: string;
  userId: string;
  criteriaId: string;
  propertyId: string;
  dealScore: number;
  matchReasons: string[];
  status: "new" | "viewed" | "saved" | "dismissed";
  notifiedVia: ("push" | "sms" | "email")[];
  createdAt: string;
}

export interface PortfolioProperty {
  id: string;
  userId: string;
  propertyId: string;
  purchasePrice: number;
  purchaseDate: string;
  currentValue: number;
  monthlyRent: number;
  monthlyExpenses: number;
  loanBalance: number;
  interestRate: number;
  notes: string;
}

export const DEFAULT_EXPENSE_ASSUMPTIONS: ExpenseAssumptions = {
  propertyTaxRate: 1.2,
  insuranceAnnual: 1500,
  maintenancePercent: 5,
  vacancyPercent: 5,
  propertyManagementPercent: 8,
  capexReservePercent: 5,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  otherMonthly: 0,
};

export const DEFAULT_FINANCING: Omit<FinancingAssumptions, "purchasePrice"> = {
  downPaymentPercent: 20,
  interestRate: 7.0,
  loanTermYears: 30,
  closingCostPercent: 3,
  rehabBudget: 0,
};
