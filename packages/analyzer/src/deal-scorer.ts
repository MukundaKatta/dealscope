/**
 * Deal Scorer
 *
 * Scores investment deals on a 1-100 scale across multiple dimensions:
 * cash flow, appreciation potential, risk, location, condition, and market.
 */

import type {
  UnderwritingResult,
  MarketData,
  DealScore,
  DealGrade,
  DealRecommendation,
} from "./types";

export interface ScoringWeights {
  cashFlow: number;
  appreciation: number;
  risk: number;
  location: number;
  condition: number;
  market: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  cashFlow: 0.30,
  appreciation: 0.15,
  risk: 0.20,
  location: 0.15,
  condition: 0.10,
  market: 0.10,
};

/**
 * Score a deal from 1-100 with grade, pros/cons, and recommendation.
 */
export function scoreDeal(
  underwriting: UnderwritingResult,
  market: MarketData | null,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): DealScore {
  const cashFlowScore = scoreCashFlow(underwriting);
  const appreciationScore = scoreAppreciation(underwriting, market);
  const riskScore = scoreRisk(underwriting);
  const locationScore = scoreLocation(market);
  const conditionScore = scoreCondition(underwriting);
  const marketScore = scoreMarket(market);

  const overall = Math.round(
    cashFlowScore * weights.cashFlow +
      appreciationScore * weights.appreciation +
      riskScore * weights.risk +
      locationScore * weights.location +
      conditionScore * weights.condition +
      marketScore * weights.market
  );

  const clampedOverall = Math.max(1, Math.min(100, overall));
  const grade = getGrade(clampedOverall);
  const pros = generatePros(underwriting, market);
  const cons = generateCons(underwriting, market);
  const recommendation = getRecommendation(clampedOverall, riskScore);

  const summary = generateSummary(
    clampedOverall,
    grade,
    recommendation,
    underwriting,
    pros,
    cons
  );

  return {
    overall: clampedOverall,
    cashFlowScore: Math.round(cashFlowScore),
    appreciationScore: Math.round(appreciationScore),
    riskScore: Math.round(riskScore),
    locationScore: Math.round(locationScore),
    conditionScore: Math.round(conditionScore),
    marketScore: Math.round(marketScore),
    grade,
    summary,
    pros,
    cons,
    recommendation,
  };
}

// ---------- Sub-Scores ----------

function scoreCashFlow(uw: UnderwritingResult): number {
  let score = 50; // Baseline

  // Cash-on-cash return
  const coc = uw.cashOnCashReturn;
  if (coc >= 12) score += 30;
  else if (coc >= 10) score += 25;
  else if (coc >= 8) score += 20;
  else if (coc >= 6) score += 12;
  else if (coc >= 4) score += 5;
  else if (coc >= 2) score -= 5;
  else if (coc >= 0) score -= 15;
  else score -= 30;

  // 1% rule
  const rentToPrice = uw.rentToPrice;
  if (rentToPrice >= 1.2) score += 15;
  else if (rentToPrice >= 1.0) score += 10;
  else if (rentToPrice >= 0.8) score += 3;
  else if (rentToPrice >= 0.6) score -= 5;
  else score -= 15;

  // Monthly cash flow absolute
  const monthlyCF = uw.cashFlow.monthlyAfterDebt;
  if (monthlyCF >= 500) score += 5;
  else if (monthlyCF >= 200) score += 2;
  else if (monthlyCF < 0) score -= 10;

  return clamp(score, 0, 100);
}

function scoreAppreciation(
  uw: UnderwritingResult,
  market: MarketData | null
): number {
  let score = 50;

  // 5-year projected total return
  const totalReturn = uw.totalReturnOnInvestment;
  if (totalReturn >= 80) score += 25;
  else if (totalReturn >= 60) score += 20;
  else if (totalReturn >= 40) score += 12;
  else if (totalReturn >= 20) score += 5;
  else score -= 10;

  // IRR
  const irr = uw.internalRateOfReturn;
  if (irr >= 20) score += 20;
  else if (irr >= 15) score += 15;
  else if (irr >= 10) score += 8;
  else if (irr >= 5) score += 2;
  else score -= 10;

  // Market appreciation
  if (market) {
    const yoy = market.yearOverYearAppreciation;
    if (yoy >= 8) score += 5;
    else if (yoy >= 4) score += 3;
    else if (yoy < 0) score -= 10;
  }

  return clamp(score, 0, 100);
}

function scoreRisk(uw: UnderwritingResult): number {
  let score = 70; // Start optimistic

  // DSCR — lower is riskier
  const dscr = uw.debtServiceCoverageRatio;
  if (dscr >= 1.5) score += 15;
  else if (dscr >= 1.25) score += 10;
  else if (dscr >= 1.1) score += 3;
  else if (dscr >= 1.0) score -= 10;
  else score -= 25;

  // Break-even ratio
  const ber = uw.breakEvenRatio;
  if (ber <= 70) score += 10;
  else if (ber <= 80) score += 5;
  else if (ber <= 90) score -= 5;
  else score -= 15;

  // Cap rate (too low = overpriced risk)
  const cap = uw.capRate;
  if (cap >= 8) score += 5;
  else if (cap >= 6) score += 2;
  else if (cap < 4) score -= 10;

  // High leverage risk
  const ltv =
    uw.loanAmount / (uw.financing.purchasePrice) * 100;
  if (ltv > 90) score -= 15;
  else if (ltv > 80) score -= 5;

  // Negative cash flow is a risk
  if (uw.cashFlow.monthlyAfterDebt < 0) score -= 15;

  return clamp(score, 0, 100);
}

function scoreLocation(market: MarketData | null): number {
  if (!market) return 50; // Neutral if no data

  let score = 50;

  // School rating
  if (market.schoolRating >= 8) score += 10;
  else if (market.schoolRating >= 6) score += 5;
  else if (market.schoolRating < 4) score -= 10;

  // Walk score
  if (market.walkScore >= 80) score += 8;
  else if (market.walkScore >= 60) score += 4;
  else if (market.walkScore < 30) score -= 5;

  // Crime (lower is better)
  if (market.crimeIndex <= 20) score += 10;
  else if (market.crimeIndex <= 40) score += 5;
  else if (market.crimeIndex >= 70) score -= 15;

  // Population growth
  if (market.populationGrowth >= 2) score += 8;
  else if (market.populationGrowth >= 0.5) score += 3;
  else if (market.populationGrowth < 0) score -= 10;

  // Median income
  if (market.medianHouseholdIncome >= 80000) score += 5;
  else if (market.medianHouseholdIncome >= 55000) score += 2;
  else if (market.medianHouseholdIncome < 35000) score -= 8;

  return clamp(score, 0, 100);
}

function scoreCondition(uw: UnderwritingResult): number {
  let score = 60;
  const prop = uw.property;

  // Year built
  const age = new Date().getFullYear() - prop.yearBuilt;
  if (age <= 10) score += 20;
  else if (age <= 25) score += 10;
  else if (age <= 50) score += 0;
  else score -= 15;

  // Price per sqft vs area norms (use list price as proxy)
  if (uw.pricePerSqFt > 0) {
    if (uw.pricePerSqFt < 100) score += 10;
    else if (uw.pricePerSqFt < 200) score += 5;
    else if (uw.pricePerSqFt > 400) score -= 10;
  }

  // Days on market (deals sit for a reason, but also opportunity)
  if (prop.daysOnMarket > 90) score += 5; // Motivated seller
  else if (prop.daysOnMarket > 60) score += 3;

  return clamp(score, 0, 100);
}

function scoreMarket(market: MarketData | null): number {
  if (!market) return 50;

  let score = 50;

  // Inventory months (lower = hotter market)
  if (market.inventoryMonths <= 2) score += 10;
  else if (market.inventoryMonths <= 4) score += 5;
  else if (market.inventoryMonths >= 8) score -= 10;

  // List-to-sale ratio
  if (market.listToSaleRatio >= 100) score += 5;
  else if (market.listToSaleRatio >= 97) score += 2;
  else if (market.listToSaleRatio < 93) score -= 10;

  // Rent growth
  if (market.rentGrowthYoY >= 5) score += 10;
  else if (market.rentGrowthYoY >= 2) score += 5;
  else if (market.rentGrowthYoY < 0) score -= 10;

  // Unemployment
  if (market.unemploymentRate <= 3.5) score += 8;
  else if (market.unemploymentRate <= 5) score += 3;
  else if (market.unemploymentRate >= 8) score -= 15;

  // Foreclosure rate
  if (market.foreclosureRate <= 0.5) score += 5;
  else if (market.foreclosureRate >= 2) score -= 10;

  return clamp(score, 0, 100);
}

// ---------- Grade & Recommendation ----------

function getGrade(score: number): DealGrade {
  if (score >= 93) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 62) return "C+";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function getRecommendation(
  score: number,
  riskScore: number
): DealRecommendation {
  if (score >= 85 && riskScore >= 60) return "strong_buy";
  if (score >= 70 && riskScore >= 50) return "buy";
  if (score >= 50) return "hold";
  if (score >= 35) return "pass";
  return "avoid";
}

// ---------- Pros & Cons ----------

function generatePros(
  uw: UnderwritingResult,
  market: MarketData | null
): string[] {
  const pros: string[] = [];

  if (uw.cashOnCashReturn >= 8)
    pros.push(`Strong ${uw.cashOnCashReturn.toFixed(1)}% cash-on-cash return`);
  if (uw.rentToPrice >= 1.0)
    pros.push(`Meets the 1% rule (${uw.rentToPrice.toFixed(2)}%)`);
  if (uw.capRate >= 7)
    pros.push(`Solid ${uw.capRate.toFixed(1)}% cap rate`);
  if (uw.debtServiceCoverageRatio >= 1.3)
    pros.push(`Healthy DSCR of ${uw.debtServiceCoverageRatio.toFixed(2)}`);
  if (uw.cashFlow.monthlyAfterDebt >= 300)
    pros.push(`$${uw.cashFlow.monthlyAfterDebt}/mo positive cash flow`);
  if (uw.internalRateOfReturn >= 15)
    pros.push(`Projected ${uw.internalRateOfReturn.toFixed(1)}% IRR over 5 years`);
  if (uw.property.daysOnMarket > 60)
    pros.push("Extended days on market suggests negotiation opportunity");

  if (market) {
    if (market.populationGrowth >= 1.5)
      pros.push(`Growing market (${market.populationGrowth.toFixed(1)}% pop growth)`);
    if (market.rentGrowthYoY >= 3)
      pros.push(`Strong rent growth (${market.rentGrowthYoY.toFixed(1)}% YoY)`);
    if (market.schoolRating >= 7)
      pros.push("Good school district");
    if (market.unemploymentRate <= 4)
      pros.push("Low unemployment area");
  }

  return pros.slice(0, 6);
}

function generateCons(
  uw: UnderwritingResult,
  market: MarketData | null
): string[] {
  const cons: string[] = [];

  if (uw.cashOnCashReturn < 4)
    cons.push(`Low ${uw.cashOnCashReturn.toFixed(1)}% cash-on-cash return`);
  if (uw.rentToPrice < 0.7)
    cons.push(`Below 1% rule (${uw.rentToPrice.toFixed(2)}%)`);
  if (uw.capRate < 5)
    cons.push(`Low ${uw.capRate.toFixed(1)}% cap rate`);
  if (uw.debtServiceCoverageRatio < 1.2)
    cons.push(`Tight DSCR of ${uw.debtServiceCoverageRatio.toFixed(2)}`);
  if (uw.cashFlow.monthlyAfterDebt < 0)
    cons.push(`Negative cash flow: -$${Math.abs(uw.cashFlow.monthlyAfterDebt)}/mo`);
  if (uw.breakEvenRatio > 85)
    cons.push(`High break-even ratio (${uw.breakEvenRatio.toFixed(1)}%)`);

  const age = new Date().getFullYear() - uw.property.yearBuilt;
  if (age > 50)
    cons.push(`Older property (built ${uw.property.yearBuilt}) may need major repairs`);

  if (market) {
    if (market.populationGrowth < 0)
      cons.push("Declining population");
    if (market.crimeIndex >= 60)
      cons.push("Higher crime area");
    if (market.unemploymentRate >= 7)
      cons.push(`High unemployment (${market.unemploymentRate}%)`);
    if (market.inventoryMonths >= 7)
      cons.push("High inventory — buyer's market, slower appreciation");
  }

  return cons.slice(0, 6);
}

// ---------- Summary ----------

function generateSummary(
  score: number,
  grade: DealGrade,
  recommendation: DealRecommendation,
  uw: UnderwritingResult,
  pros: string[],
  cons: string[]
): string {
  const recText: Record<DealRecommendation, string> = {
    strong_buy: "This is an excellent investment opportunity",
    buy: "This is a good investment opportunity worth pursuing",
    hold: "This deal has potential but may require negotiation or further due diligence",
    pass: "This deal does not meet standard investment criteria",
    avoid: "This deal carries significant risk and is not recommended",
  };

  const addr = uw.property.address;
  const city = uw.property.city;

  let summary = `${addr}, ${city} scores ${score}/100 (Grade: ${grade}). `;
  summary += `${recText[recommendation]}. `;
  summary += `At a purchase price of $${uw.financing.purchasePrice.toLocaleString()}, `;
  summary += `the property projects a ${uw.capRate.toFixed(1)}% cap rate `;
  summary += `and ${uw.cashOnCashReturn.toFixed(1)}% cash-on-cash return `;
  summary += `with $${uw.cashFlow.monthlyAfterDebt.toLocaleString()}/mo cash flow. `;

  if (pros.length > 0) {
    summary += `Key strengths: ${pros[0]!.toLowerCase()}`;
    if (pros.length > 1) summary += ` and ${pros[1]!.toLowerCase()}`;
    summary += ". ";
  }

  if (cons.length > 0) {
    summary += `Watch out for: ${cons[0]!.toLowerCase()}`;
    if (cons.length > 1) summary += ` and ${cons[1]!.toLowerCase()}`;
    summary += ".";
  }

  return summary;
}

// ---------- Helpers ----------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
