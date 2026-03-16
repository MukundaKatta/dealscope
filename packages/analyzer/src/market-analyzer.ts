/**
 * Market Analyzer
 *
 * Analyzes neighborhoods, ZIP codes, and cities for investment potential.
 * Integrates Census data, crime stats, school ratings, and real estate metrics.
 */

import type { MarketData, MarketTemperature } from "./types";

export interface CensusData {
  zipCode: string;
  totalPopulation: number;
  medianAge: number;
  medianHouseholdIncome: number;
  medianHomeValue: number;
  ownerOccupiedPercent: number;
  renterOccupiedPercent: number;
  vacancyRate: number;
  bachelorDegreePercent: number;
  unemploymentRate: number;
  povertyRate: number;
  populationGrowth1Yr: number;
  populationGrowth5Yr: number;
}

export interface MarketMetrics {
  medianListPrice: number;
  medianSalePrice: number;
  medianRent: number;
  medianDaysOnMarket: number;
  listToSaleRatio: number;
  activeListings: number;
  monthsOfInventory: number;
  priceAppreciation1Yr: number;
  priceAppreciation5Yr: number;
  rentGrowth1Yr: number;
  newListings30Days: number;
  closedSales30Days: number;
  foreclosureRate: number;
  avgPricePerSqFt: number;
}

export interface MarketAnalysis {
  data: MarketData;
  investmentGrade: MarketInvestmentGrade;
  priceToRentAnalysis: PriceToRentAnalysis;
  supplyDemandSignals: SupplyDemandSignals;
  recommendations: string[];
  investmentStrategies: InvestmentStrategy[];
}

export interface MarketInvestmentGrade {
  overall: "A" | "B" | "C" | "D" | "F";
  cashFlowPotential: number; // 1-10
  appreciationPotential: number;
  rentalDemand: number;
  economicStrength: number;
  affordability: number;
}

export interface PriceToRentAnalysis {
  ratio: number;
  favorsBuying: boolean;
  favorsRenting: boolean;
  interpretation: string;
}

export interface SupplyDemandSignals {
  absorptionRate: number; // months
  inventoryTrend: "decreasing" | "stable" | "increasing";
  priceTrend: "declining" | "flat" | "rising" | "surging";
  demandIndicators: string[];
  supplyIndicators: string[];
}

export interface InvestmentStrategy {
  name: string;
  suitability: "excellent" | "good" | "moderate" | "poor";
  description: string;
  targetReturns: string;
}

/**
 * Perform comprehensive market analysis for a ZIP code or city.
 */
export function analyzeMarket(
  census: CensusData,
  metrics: MarketMetrics,
  schoolRating: number, // 1-10
  walkScore: number, // 0-100
  crimeIndex: number // 0-100 (lower = safer)
): MarketAnalysis {
  const priceToRent =
    metrics.medianSalePrice > 0 && metrics.medianRent > 0
      ? metrics.medianSalePrice / (metrics.medianRent * 12)
      : 0;

  const temperature = determineTemperature(metrics);

  const data: MarketData = {
    zipCode: census.zipCode,
    city: "",
    state: "",
    medianHomePrice: metrics.medianSalePrice,
    medianRent: metrics.medianRent,
    priceToRentRatio: Math.round(priceToRent * 10) / 10,
    yearOverYearAppreciation: metrics.priceAppreciation1Yr,
    populationGrowth: census.populationGrowth1Yr,
    medianHouseholdIncome: census.medianHouseholdIncome,
    unemploymentRate: census.unemploymentRate,
    crimeIndex,
    schoolRating,
    walkScore,
    inventoryMonths: metrics.monthsOfInventory,
    daysOnMarketMedian: metrics.medianDaysOnMarket,
    listToSaleRatio: metrics.listToSaleRatio,
    foreclosureRate: metrics.foreclosureRate,
    newConstructionPermits: 0,
    rentGrowthYoY: metrics.rentGrowth1Yr,
    marketTemperature: temperature,
  };

  const investmentGrade = gradeMarket(data, census);
  const priceToRentAnalysis = analyzePriceToRent(priceToRent);
  const supplyDemandSignals = analyzeSupplyDemand(metrics);
  const recommendations = generateMarketRecommendations(data, investmentGrade);
  const investmentStrategies = suggestStrategies(data, investmentGrade);

  return {
    data,
    investmentGrade,
    priceToRentAnalysis,
    supplyDemandSignals,
    recommendations,
    investmentStrategies,
  };
}

function determineTemperature(metrics: MarketMetrics): MarketTemperature {
  let heatScore = 0;

  // Days on market
  if (metrics.medianDaysOnMarket < 15) heatScore += 3;
  else if (metrics.medianDaysOnMarket < 30) heatScore += 2;
  else if (metrics.medianDaysOnMarket < 60) heatScore += 1;
  else if (metrics.medianDaysOnMarket > 90) heatScore -= 1;

  // List-to-sale ratio
  if (metrics.listToSaleRatio > 102) heatScore += 2;
  else if (metrics.listToSaleRatio > 100) heatScore += 1;
  else if (metrics.listToSaleRatio < 95) heatScore -= 2;
  else if (metrics.listToSaleRatio < 97) heatScore -= 1;

  // Inventory
  if (metrics.monthsOfInventory < 2) heatScore += 2;
  else if (metrics.monthsOfInventory < 4) heatScore += 1;
  else if (metrics.monthsOfInventory > 7) heatScore -= 2;
  else if (metrics.monthsOfInventory > 5) heatScore -= 1;

  // Appreciation
  if (metrics.priceAppreciation1Yr > 10) heatScore += 2;
  else if (metrics.priceAppreciation1Yr > 5) heatScore += 1;
  else if (metrics.priceAppreciation1Yr < 0) heatScore -= 2;

  if (heatScore >= 7) return "hot";
  if (heatScore >= 4) return "warm";
  if (heatScore >= 0) return "neutral";
  if (heatScore >= -3) return "cool";
  return "cold";
}

function gradeMarket(
  data: MarketData,
  census: CensusData
): MarketInvestmentGrade {
  // Cash flow potential (low price-to-rent ratio = better cash flow)
  let cashFlow = 5;
  if (data.priceToRentRatio <= 12) cashFlow = 9;
  else if (data.priceToRentRatio <= 15) cashFlow = 7;
  else if (data.priceToRentRatio <= 20) cashFlow = 5;
  else if (data.priceToRentRatio <= 25) cashFlow = 3;
  else cashFlow = 1;

  // Appreciation potential
  let appreciation = 5;
  if (data.yearOverYearAppreciation >= 8 && data.populationGrowth >= 1.5)
    appreciation = 9;
  else if (data.yearOverYearAppreciation >= 5) appreciation = 7;
  else if (data.yearOverYearAppreciation >= 2) appreciation = 5;
  else if (data.yearOverYearAppreciation >= 0) appreciation = 3;
  else appreciation = 1;

  // Rental demand
  let rentalDemand = 5;
  const renterPct = census.renterOccupiedPercent;
  if (renterPct >= 60 && census.vacancyRate < 5) rentalDemand = 9;
  else if (renterPct >= 45 && census.vacancyRate < 7) rentalDemand = 7;
  else if (renterPct >= 35) rentalDemand = 5;
  else rentalDemand = 3;

  // Economic strength
  let economic = 5;
  if (
    census.medianHouseholdIncome >= 70000 &&
    census.unemploymentRate <= 4
  )
    economic = 9;
  else if (census.medianHouseholdIncome >= 55000 && census.unemploymentRate <= 5.5)
    economic = 7;
  else if (census.unemploymentRate <= 6.5) economic = 5;
  else economic = 3;

  // Affordability
  let affordability = 5;
  const incomeToPrice =
    census.medianHouseholdIncome > 0
      ? data.medianHomePrice / census.medianHouseholdIncome
      : 5;
  if (incomeToPrice <= 3) affordability = 9;
  else if (incomeToPrice <= 4) affordability = 7;
  else if (incomeToPrice <= 5.5) affordability = 5;
  else if (incomeToPrice <= 8) affordability = 3;
  else affordability = 1;

  const avg =
    (cashFlow + appreciation + rentalDemand + economic + affordability) / 5;
  const overall =
    avg >= 7.5
      ? "A"
      : avg >= 6
      ? "B"
      : avg >= 4.5
      ? "C"
      : avg >= 3
      ? "D"
      : "F";

  return {
    overall,
    cashFlowPotential: cashFlow,
    appreciationPotential: appreciation,
    rentalDemand,
    economicStrength: economic,
    affordability,
  };
}

function analyzePriceToRent(ratio: number): PriceToRentAnalysis {
  if (ratio <= 15) {
    return {
      ratio: Math.round(ratio * 10) / 10,
      favorsBuying: true,
      favorsRenting: false,
      interpretation:
        "Excellent for investors. Low price-to-rent ratio indicates strong cash flow potential. Properties are cheap relative to achievable rents.",
    };
  } else if (ratio <= 20) {
    return {
      ratio: Math.round(ratio * 10) / 10,
      favorsBuying: true,
      favorsRenting: false,
      interpretation:
        "Good for investors. Moderate price-to-rent ratio supports positive cash flow with reasonable leverage.",
    };
  } else if (ratio <= 25) {
    return {
      ratio: Math.round(ratio * 10) / 10,
      favorsBuying: false,
      favorsRenting: false,
      interpretation:
        "Neutral market. Cash flow may be tight; investors should focus on appreciation potential and value-add strategies.",
    };
  } else {
    return {
      ratio: Math.round(ratio * 10) / 10,
      favorsBuying: false,
      favorsRenting: true,
      interpretation:
        "Challenging for cash flow investors. High price-to-rent ratio means properties are expensive relative to rents. Focus on appreciation or consider other markets.",
    };
  }
}

function analyzeSupplyDemand(metrics: MarketMetrics): SupplyDemandSignals {
  const absorptionRate =
    metrics.closedSales30Days > 0
      ? metrics.activeListings / metrics.closedSales30Days
      : metrics.monthsOfInventory;

  let inventoryTrend: SupplyDemandSignals["inventoryTrend"] = "stable";
  if (metrics.monthsOfInventory < 3) inventoryTrend = "decreasing";
  else if (metrics.monthsOfInventory > 6) inventoryTrend = "increasing";

  let priceTrend: SupplyDemandSignals["priceTrend"] = "flat";
  if (metrics.priceAppreciation1Yr > 8) priceTrend = "surging";
  else if (metrics.priceAppreciation1Yr > 2) priceTrend = "rising";
  else if (metrics.priceAppreciation1Yr < -2) priceTrend = "declining";

  const demandIndicators: string[] = [];
  const supplyIndicators: string[] = [];

  if (metrics.medianDaysOnMarket < 20)
    demandIndicators.push("Properties selling quickly");
  if (metrics.listToSaleRatio > 100)
    demandIndicators.push("Properties selling above asking price");
  if (metrics.monthsOfInventory < 3)
    demandIndicators.push("Low inventory driving competition");
  if (metrics.rentGrowth1Yr > 3)
    demandIndicators.push("Rising rents indicate strong rental demand");

  if (metrics.monthsOfInventory > 6)
    supplyIndicators.push("High inventory levels");
  if (metrics.medianDaysOnMarket > 60)
    supplyIndicators.push("Slow absorption rate");
  if (metrics.listToSaleRatio < 97)
    supplyIndicators.push("Sellers accepting significant price reductions");
  if (metrics.foreclosureRate > 1)
    supplyIndicators.push("Elevated foreclosure activity adding inventory");

  return {
    absorptionRate: Math.round(absorptionRate * 10) / 10,
    inventoryTrend,
    priceTrend,
    demandIndicators,
    supplyIndicators,
  };
}

function generateMarketRecommendations(
  data: MarketData,
  grade: MarketInvestmentGrade
): string[] {
  const recs: string[] = [];

  if (grade.cashFlowPotential >= 7) {
    recs.push(
      "Strong cash flow market — buy-and-hold rental strategy is well-suited here."
    );
  }
  if (grade.appreciationPotential >= 7) {
    recs.push(
      "High appreciation potential — consider value-add strategies to maximize equity gains."
    );
  }
  if (data.marketTemperature === "hot") {
    recs.push(
      "Hot market — move quickly on deals and prepare competitive offers."
    );
  }
  if (data.marketTemperature === "cold" || data.marketTemperature === "cool") {
    recs.push(
      "Cool/cold market — negotiate aggressively and look for motivated sellers."
    );
  }
  if (data.forecastureRate > 1.5) {
    recs.push(
      "Elevated foreclosures — monitor auction and REO listings for below-market deals."
    );
  }
  if (grade.rentalDemand >= 7) {
    recs.push(
      "High rental demand — expect low vacancy and stable tenant pool."
    );
  }
  if (grade.affordability <= 3) {
    recs.push(
      "Low affordability — consider smaller units or higher down payments to maintain cash flow."
    );
  }

  return recs.slice(0, 5);
}

function suggestStrategies(
  data: MarketData,
  grade: MarketInvestmentGrade
): InvestmentStrategy[] {
  const strategies: InvestmentStrategy[] = [];

  // Buy and hold
  const buyHoldSuit =
    grade.cashFlowPotential >= 7
      ? "excellent"
      : grade.cashFlowPotential >= 5
      ? "good"
      : grade.cashFlowPotential >= 3
      ? "moderate"
      : "poor";
  strategies.push({
    name: "Buy & Hold Rental",
    suitability: buyHoldSuit,
    description:
      "Purchase and rent long-term for cash flow and appreciation.",
    targetReturns:
      grade.cashFlowPotential >= 7
        ? "8-12% cash-on-cash, 3-5% annual appreciation"
        : "4-7% cash-on-cash, dependent on market conditions",
  });

  // BRRRR
  const brrrrSuit =
    grade.cashFlowPotential >= 6 && grade.appreciationPotential >= 5
      ? "excellent"
      : grade.cashFlowPotential >= 4
      ? "good"
      : "moderate";
  strategies.push({
    name: "BRRRR",
    suitability: brrrrSuit,
    description:
      "Buy, Rehab, Rent, Refinance, Repeat — force equity and recycle capital.",
    targetReturns: "Infinite cash-on-cash if fully refinanced, 15-25% equity gain",
  });

  // House hacking
  strategies.push({
    name: "House Hacking",
    suitability: grade.affordability >= 5 ? "excellent" : "good",
    description:
      "Live in one unit, rent others to offset mortgage.",
    targetReturns: "50-100% reduction in housing costs, build equity",
  });

  // Fix and flip
  const flipSuit =
    data.marketTemperature === "hot" || data.marketTemperature === "warm"
      ? "good"
      : data.marketTemperature === "cold"
      ? "poor"
      : "moderate";
  strategies.push({
    name: "Fix & Flip",
    suitability: flipSuit,
    description:
      "Buy distressed, renovate, and sell for profit.",
    targetReturns:
      "15-25% ROI per flip, 6-12 month holding period",
  });

  return strategies;
}
