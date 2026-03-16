/**
 * DealScope Underwriter
 *
 * Core financial engine that calculates ROI, cap rate, cash-on-cash return,
 * DSCR, NOI, and multi-year projections for investment properties.
 */

import type {
  Property,
  FinancingAssumptions,
  ExpenseAssumptions,
  RentEstimate,
  UnderwritingResult,
  ExpenseBreakdown,
  CashFlowResult,
  YearProjection,
  DEFAULT_EXPENSE_ASSUMPTIONS,
  DEFAULT_FINANCING,
} from "./types";

// ---------- Mortgage Math ----------

/** Monthly mortgage payment (P&I) using standard amortization formula */
export function calculateMonthlyMortgage(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/** Outstanding loan balance after N months */
export function loanBalanceAfterMonths(
  principal: number,
  annualRate: number,
  termYears: number,
  monthsElapsed: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) {
    const monthlyPayment = principal / (termYears * 12);
    return Math.max(0, principal - monthlyPayment * monthsElapsed);
  }
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return (
    principal *
    ((Math.pow(1 + r, n) - Math.pow(1 + r, monthsElapsed)) /
      (Math.pow(1 + r, n) - 1))
  );
}

/** Total interest paid over the life of a loan */
export function totalInterestPaid(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthly = calculateMonthlyMortgage(principal, annualRate, termYears);
  return monthly * termYears * 12 - principal;
}

// ---------- Expense Calculator ----------

export function calculateExpenseBreakdown(
  monthlyMortgage: number,
  propertyValue: number,
  grossMonthlyRent: number,
  assumptions: ExpenseAssumptions
): ExpenseBreakdown {
  const monthlyTax = (propertyValue * (assumptions.propertyTaxRate / 100)) / 12;
  const monthlyInsurance = assumptions.insuranceAnnual / 12;
  const maintenance = grossMonthlyRent * (assumptions.maintenancePercent / 100);
  const vacancy = grossMonthlyRent * (assumptions.vacancyPercent / 100);
  const management =
    grossMonthlyRent * (assumptions.propertyManagementPercent / 100);
  const capex = grossMonthlyRent * (assumptions.capexReservePercent / 100);

  return {
    mortgage: monthlyMortgage,
    propertyTax: monthlyTax,
    insurance: monthlyInsurance,
    maintenance,
    vacancy,
    propertyManagement: management,
    capexReserve: capex,
    hoa: assumptions.hoaMonthly,
    utilities: assumptions.utilitiesMonthly,
    other: assumptions.otherMonthly,
  };
}

export function totalMonthlyExpenses(breakdown: ExpenseBreakdown): number {
  return (
    breakdown.mortgage +
    breakdown.propertyTax +
    breakdown.insurance +
    breakdown.maintenance +
    breakdown.vacancy +
    breakdown.propertyManagement +
    breakdown.capexReserve +
    breakdown.hoa +
    breakdown.utilities +
    breakdown.other
  );
}

export function operatingExpensesMonthly(breakdown: ExpenseBreakdown): number {
  // Operating expenses exclude mortgage (debt service)
  return totalMonthlyExpenses(breakdown) - breakdown.mortgage;
}

// ---------- Return Metrics ----------

/** Net Operating Income = Effective Gross Income - Operating Expenses (excludes debt) */
export function calculateNOI(
  grossAnnualRent: number,
  vacancyPercent: number,
  annualOperatingExpenses: number
): number {
  const effectiveGross = grossAnnualRent * (1 - vacancyPercent / 100);
  return effectiveGross - annualOperatingExpenses;
}

/** Cap Rate = NOI / Property Value */
export function calculateCapRate(noi: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return (noi / propertyValue) * 100;
}

/** Cash-on-Cash = Annual Pre-tax Cash Flow / Total Cash Invested */
export function calculateCashOnCash(
  annualCashFlow: number,
  totalCashInvested: number
): number {
  if (totalCashInvested <= 0) return 0;
  return (annualCashFlow / totalCashInvested) * 100;
}

/** Gross Rent Multiplier = Purchase Price / Annual Gross Rent */
export function calculateGRM(
  purchasePrice: number,
  annualGrossRent: number
): number {
  if (annualGrossRent <= 0) return Infinity;
  return purchasePrice / annualGrossRent;
}

/** Debt Service Coverage Ratio = NOI / Annual Debt Service */
export function calculateDSCR(
  noi: number,
  annualDebtService: number
): number {
  if (annualDebtService <= 0) return Infinity;
  return noi / annualDebtService;
}

/** Break-even occupancy ratio */
export function calculateBreakEvenRatio(
  annualOperatingExpenses: number,
  annualDebtService: number,
  grossAnnualRent: number
): number {
  if (grossAnnualRent <= 0) return Infinity;
  return ((annualOperatingExpenses + annualDebtService) / grossAnnualRent) * 100;
}

/** 1% Rule check: monthly rent / purchase price */
export function calculateRentToPrice(
  monthlyRent: number,
  purchasePrice: number
): number {
  if (purchasePrice <= 0) return 0;
  return (monthlyRent / purchasePrice) * 100;
}

// ---------- IRR Calculation ----------

/** Internal Rate of Return using Newton's method */
export function calculateIRR(
  cashFlows: number[],
  maxIterations = 1000,
  tolerance = 0.00001
): number {
  if (cashFlows.length < 2) return 0;

  let guess = 0.1; // Start with 10%

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const cf = cashFlows[t]!;
      const denom = Math.pow(1 + guess, t);
      npv += cf / denom;
      dnpv -= (t * cf) / (denom * (1 + guess));
    }

    if (Math.abs(npv) < tolerance) break;
    if (Math.abs(dnpv) < tolerance) break;

    const newGuess = guess - npv / dnpv;
    if (Math.abs(newGuess - guess) < tolerance) break;
    guess = newGuess;
  }

  return isFinite(guess) ? guess * 100 : 0;
}

// ---------- Projection Engine ----------

export interface ProjectionConfig {
  appreciationRate: number; // annual percent
  rentGrowthRate: number; // annual percent
  expenseGrowthRate: number; // annual percent
  holdingPeriodYears: number;
}

export const DEFAULT_PROJECTION: ProjectionConfig = {
  appreciationRate: 3.0,
  rentGrowthRate: 2.5,
  expenseGrowthRate: 2.0,
  holdingPeriodYears: 5,
};

export function generateProjections(
  purchasePrice: number,
  loanAmount: number,
  annualRate: number,
  loanTermYears: number,
  yearOneRent: number,
  yearOneExpenses: number, // operating expenses only
  totalCashInvested: number,
  config: ProjectionConfig = DEFAULT_PROJECTION
): YearProjection[] {
  const projections: YearProjection[] = [];
  let cumulativeCashFlow = 0;
  const annualDebtService =
    calculateMonthlyMortgage(loanAmount, annualRate, loanTermYears) * 12;

  for (let year = 1; year <= config.holdingPeriodYears; year++) {
    const propertyValue =
      purchasePrice * Math.pow(1 + config.appreciationRate / 100, year);
    const loanBalance = loanBalanceAfterMonths(
      loanAmount,
      annualRate,
      loanTermYears,
      year * 12
    );
    const equity = propertyValue - loanBalance;

    const annualRent =
      yearOneRent * Math.pow(1 + config.rentGrowthRate / 100, year - 1);
    const annualExpenses =
      yearOneExpenses * Math.pow(1 + config.expenseGrowthRate / 100, year - 1);

    const annualCashFlow = annualRent - annualExpenses - annualDebtService;
    cumulativeCashFlow += annualCashFlow;

    const appreciation = propertyValue - purchasePrice;
    const principalPaydown = loanAmount - loanBalance;
    const totalReturn =
      ((cumulativeCashFlow + appreciation + principalPaydown) /
        totalCashInvested) *
      100;

    projections.push({
      year,
      propertyValue: round(propertyValue),
      loanBalance: round(loanBalance),
      equity: round(equity),
      annualRent: round(annualRent),
      annualExpenses: round(annualExpenses + annualDebtService),
      annualCashFlow: round(annualCashFlow),
      cumulativeCashFlow: round(cumulativeCashFlow),
      totalReturn: round(totalReturn, 2),
      cashOnCash: round(
        totalCashInvested > 0
          ? (annualCashFlow / totalCashInvested) * 100
          : 0,
        2
      ),
    });
  }

  return projections;
}

// ---------- Full Underwriting ----------

export function underwriteProperty(
  property: Property,
  rentEstimate: RentEstimate,
  financing: FinancingAssumptions,
  expenses: ExpenseAssumptions,
  projectionConfig: ProjectionConfig = DEFAULT_PROJECTION
): UnderwritingResult {
  const purchasePrice = financing.purchasePrice;
  const downPayment = purchasePrice * (financing.downPaymentPercent / 100);
  const closingCosts = purchasePrice * (financing.closingCostPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const totalInvestment = downPayment + closingCosts + financing.rehabBudget;

  const monthlyMortgage = calculateMonthlyMortgage(
    loanAmount,
    financing.interestRate,
    financing.loanTermYears
  );

  const grossMonthlyRent = rentEstimate.estimatedRent;
  const effectiveGrossIncome =
    grossMonthlyRent * (1 - expenses.vacancyPercent / 100);
  const annualGrossIncome = effectiveGrossIncome * 12;

  const expenseBreakdown = calculateExpenseBreakdown(
    monthlyMortgage,
    purchasePrice,
    grossMonthlyRent,
    expenses
  );

  const monthlyExpensesTotal = totalMonthlyExpenses(expenseBreakdown);
  const monthlyOpex = operatingExpensesMonthly(expenseBreakdown);
  const annualOpex = monthlyOpex * 12;
  const annualDebtService = monthlyMortgage * 12;

  const noi = calculateNOI(
    grossMonthlyRent * 12,
    expenses.vacancyPercent,
    annualOpex
  );

  const monthlyCashFlowAfterDebt = effectiveGrossIncome - monthlyExpensesTotal;
  const annualCashFlowAfterDebt = monthlyCashFlowAfterDebt * 12;

  const cashFlow: CashFlowResult = {
    monthlyPreTax: round(effectiveGrossIncome - monthlyOpex),
    annualPreTax: round((effectiveGrossIncome - monthlyOpex) * 12),
    monthlyAfterDebt: round(monthlyCashFlowAfterDebt),
    annualAfterDebt: round(annualCashFlowAfterDebt),
  };

  const capRate = calculateCapRate(noi, purchasePrice);
  const cashOnCash = calculateCashOnCash(annualCashFlowAfterDebt, totalInvestment);
  const grm = calculateGRM(purchasePrice, grossMonthlyRent * 12);
  const dscr = calculateDSCR(noi, annualDebtService);
  const breakEven = calculateBreakEvenRatio(
    annualOpex,
    annualDebtService,
    grossMonthlyRent * 12
  );
  const rentToPrice = calculateRentToPrice(grossMonthlyRent, purchasePrice);

  const projections = generateProjections(
    purchasePrice,
    loanAmount,
    financing.interestRate,
    financing.loanTermYears,
    annualGrossIncome,
    annualOpex,
    totalInvestment,
    projectionConfig
  );

  // Calculate IRR from projections
  const irrCashFlows = [-totalInvestment];
  for (const proj of projections) {
    irrCashFlows.push(proj.annualCashFlow);
  }
  // Add sale proceeds in final year
  const finalYear = projections[projections.length - 1];
  if (finalYear) {
    const sellingCosts = finalYear.propertyValue * 0.06; // 6% selling costs
    irrCashFlows[irrCashFlows.length - 1]! +=
      finalYear.propertyValue - finalYear.loanBalance - sellingCosts;
  }
  const irr = calculateIRR(irrCashFlows);

  const units = getUnitCount(property.propertyType);

  return {
    property,
    financing,
    expenses,
    rentEstimate,

    totalInvestment: round(totalInvestment),
    downPayment: round(downPayment),
    closingCosts: round(closingCosts),
    loanAmount: round(loanAmount),
    monthlyMortgage: round(monthlyMortgage),

    grossMonthlyRent: round(grossMonthlyRent),
    effectiveGrossIncome: round(effectiveGrossIncome),
    annualGrossIncome: round(annualGrossIncome),

    totalMonthlyExpenses: round(monthlyExpensesTotal),
    totalAnnualExpenses: round(monthlyExpensesTotal * 12),
    expenseBreakdown: roundBreakdown(expenseBreakdown),

    netOperatingIncome: round(noi),
    cashFlow,
    capRate: round(capRate, 2),
    cashOnCashReturn: round(cashOnCash, 2),
    grossRentMultiplier: round(grm, 2),
    debtServiceCoverageRatio: round(dscr, 2),
    breakEvenRatio: round(breakEven, 2),
    pricePerUnit: round(purchasePrice / units),
    pricePerSqFt: round(
      property.squareFeet > 0 ? purchasePrice / property.squareFeet : 0,
      2
    ),
    rentToPrice: round(rentToPrice, 2),

    fiveYearProjection: projections,
    internalRateOfReturn: round(irr, 2),
    totalReturnOnInvestment: finalYear ? round(finalYear.totalReturn, 2) : 0,
  };
}

// ---------- Rehab Cost Estimator ----------

export interface RehabEstimate {
  totalCost: number;
  costPerSqFt: number;
  items: RehabLineItem[];
  timelineWeeks: number;
}

export interface RehabLineItem {
  category: string;
  description: string;
  estimatedCost: number;
  priority: "critical" | "recommended" | "cosmetic";
}

export function estimateRehabCosts(
  squareFeet: number,
  yearBuilt: number,
  condition: "excellent" | "good" | "fair" | "poor" | "gut_rehab"
): RehabEstimate {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;

  const baseCostPerSqFt: Record<string, number> = {
    excellent: 0,
    good: 5,
    fair: 20,
    poor: 45,
    gut_rehab: 80,
  };

  const ageFactor = age > 50 ? 1.3 : age > 30 ? 1.15 : age > 15 ? 1.05 : 1.0;
  const costPerSqFt = (baseCostPerSqFt[condition] ?? 20) * ageFactor;
  const totalCost = costPerSqFt * squareFeet;

  const items: RehabLineItem[] = [];

  if (condition === "gut_rehab" || condition === "poor") {
    items.push(
      { category: "Electrical", description: "Full electrical rewire and panel upgrade", estimatedCost: round(squareFeet * 8), priority: "critical" },
      { category: "Plumbing", description: "Replace main lines and fixtures", estimatedCost: round(squareFeet * 7), priority: "critical" },
      { category: "HVAC", description: "New HVAC system", estimatedCost: round(Math.min(squareFeet * 5, 12000)), priority: "critical" },
      { category: "Roof", description: age > 20 ? "Full roof replacement" : "Roof repair", estimatedCost: round(squareFeet * 4), priority: "critical" },
      { category: "Flooring", description: "New flooring throughout", estimatedCost: round(squareFeet * 6), priority: "recommended" },
      { category: "Kitchen", description: "Full kitchen renovation", estimatedCost: round(Math.min(squareFeet * 12, 25000)), priority: "recommended" },
      { category: "Bathrooms", description: "Bathroom renovations", estimatedCost: round(Math.min(squareFeet * 5, 15000)), priority: "recommended" },
      { category: "Paint", description: "Interior and exterior paint", estimatedCost: round(squareFeet * 3), priority: "cosmetic" }
    );
  } else if (condition === "fair") {
    items.push(
      { category: "HVAC", description: "HVAC service/repair", estimatedCost: round(3500), priority: "critical" },
      { category: "Flooring", description: "Replace worn flooring", estimatedCost: round(squareFeet * 3), priority: "recommended" },
      { category: "Kitchen", description: "Kitchen refresh (counters, hardware)", estimatedCost: round(8000), priority: "recommended" },
      { category: "Paint", description: "Interior paint", estimatedCost: round(squareFeet * 1.5), priority: "cosmetic" },
      { category: "Landscaping", description: "Curb appeal improvements", estimatedCost: round(2500), priority: "cosmetic" }
    );
  } else if (condition === "good") {
    items.push(
      { category: "Paint", description: "Touch-up paint", estimatedCost: round(squareFeet * 0.75), priority: "cosmetic" },
      { category: "Fixtures", description: "Update light fixtures and hardware", estimatedCost: round(1500), priority: "cosmetic" },
      { category: "Landscaping", description: "Minor landscaping", estimatedCost: round(1000), priority: "cosmetic" }
    );
  }

  const timelineWeeks =
    condition === "gut_rehab"
      ? 16
      : condition === "poor"
      ? 12
      : condition === "fair"
      ? 6
      : condition === "good"
      ? 2
      : 0;

  return {
    totalCost: round(totalCost),
    costPerSqFt: round(costPerSqFt, 2),
    items,
    timelineWeeks,
  };
}

// ---------- Helpers ----------

function getUnitCount(type: string): number {
  switch (type) {
    case "duplex":
      return 2;
    case "triplex":
      return 3;
    case "fourplex":
      return 4;
    default:
      return 1;
  }
}

function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function roundBreakdown(b: ExpenseBreakdown): ExpenseBreakdown {
  return {
    mortgage: round(b.mortgage),
    propertyTax: round(b.propertyTax),
    insurance: round(b.insurance),
    maintenance: round(b.maintenance),
    vacancy: round(b.vacancy),
    propertyManagement: round(b.propertyManagement),
    capexReserve: round(b.capexReserve),
    hoa: round(b.hoa),
    utilities: round(b.utilities),
    other: round(b.other),
  };
}
