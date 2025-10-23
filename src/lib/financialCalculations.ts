/**
 * Financial calculation utilities for the simulator
 */

export interface CompoundInterestResult {
  finalAmount: number;
  totalContributions: number;
  totalInterest: number;
  monthlyBreakdown: Array<{
    month: number;
    balance: number;
    interest: number;
    contribution: number;
  }>;
}

export interface FinancingResult {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  amortization: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

export interface InvestmentProjection {
  years: number;
  finalAmount: number;
  totalContributions: number;
  totalReturns: number;
  annualBreakdown: Array<{
    year: number;
    balance: number;
    contribution: number;
    returns: number;
  }>;
}

/**
 * Calculate compound interest with monthly contributions
 */
export function calculateCompoundInterest(
  initialAmount: number,
  monthlyContribution: number,
  annualRate: number,
  months: number
): CompoundInterestResult {
  const monthlyRate = annualRate / 100 / 12;
  let balance = initialAmount;
  const breakdown = [];
  
  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;
    balance += interest + monthlyContribution;
    
    breakdown.push({
      month,
      balance: Math.round(balance * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      contribution: monthlyContribution,
    });
  }
  
  const totalContributions = initialAmount + (monthlyContribution * months);
  const finalAmount = balance;
  const totalInterest = finalAmount - totalContributions;
  
  return {
    finalAmount: Math.round(finalAmount * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyBreakdown: breakdown,
  };
}

/**
 * Calculate loan financing using Price Table (constant payments)
 */
export function calculateFinancing(
  amount: number,
  annualRate: number,
  months: number
): FinancingResult {
  const monthlyRate = annualRate / 100 / 12;
  
  // Price formula: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
  const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
    (Math.pow(1 + monthlyRate, months) - 1);
  
  let balance = amount;
  const amortization = [];
  
  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;
    
    amortization.push({
      month,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.max(0, Math.round(balance * 100) / 100),
    });
  }
  
  const totalPaid = monthlyPayment * months;
  const totalInterest = totalPaid - amount;
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    amortization,
  };
}

/**
 * Project investment growth over years
 */
export function calculateInvestmentProjection(
  monthlyInvestment: number,
  annualReturn: number,
  years: number
): InvestmentProjection {
  const monthlyRate = annualReturn / 100 / 12;
  let balance = 0;
  const annualBreakdown = [];
  
  for (let year = 1; year <= years; year++) {
    let yearContribution = 0;
    let yearReturns = 0;
    
    for (let month = 1; month <= 12; month++) {
      const returns = balance * monthlyRate;
      balance += returns + monthlyInvestment;
      yearContribution += monthlyInvestment;
      yearReturns += returns;
    }
    
    annualBreakdown.push({
      year,
      balance: Math.round(balance * 100) / 100,
      contribution: Math.round(yearContribution * 100) / 100,
      returns: Math.round(yearReturns * 100) / 100,
    });
  }
  
  const totalContributions = monthlyInvestment * 12 * years;
  const finalAmount = balance;
  const totalReturns = finalAmount - totalContributions;
  
  return {
    years,
    finalAmount: Math.round(finalAmount * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalReturns: Math.round(totalReturns * 100) / 100,
    annualBreakdown,
  };
}

/**
 * Calculate "What if" scenario based on savings
 */
export function calculateSavingsGoal(
  targetAmount: number,
  currentAmount: number,
  annualRate: number
): {
  monthlyNeeded: number;
  timeInMonths: number;
} {
  const monthlyRate = annualRate / 100 / 12;
  const remaining = targetAmount - currentAmount;
  
  if (remaining <= 0) {
    return { monthlyNeeded: 0, timeInMonths: 0 };
  }
  
  // Simplified calculation assuming monthly contributions
  // Future Value = Present Value * (1 + rate)^time + PMT * (((1 + rate)^time - 1) / rate)
  // Solving for PMT with assumption of 36 months
  const assumedMonths = 36;
  const futureValueOfCurrent = currentAmount * Math.pow(1 + monthlyRate, assumedMonths);
  const futureValueFactor = (Math.pow(1 + monthlyRate, assumedMonths) - 1) / monthlyRate;
  const monthlyNeeded = (targetAmount - futureValueOfCurrent) / futureValueFactor;
  
  return {
    monthlyNeeded: Math.max(0, Math.round(monthlyNeeded * 100) / 100),
    timeInMonths: assumedMonths,
  };
}

/**
 * Calculate retirement planning
 */
export function calculateRetirement(
  currentAge: number,
  retirementAge: number,
  monthlyExpenses: number,
  yearsInRetirement: number = 25,
  inflationRate: number = 4
): {
  totalNeeded: number;
  monthlyInvestmentNeeded: number;
  yearsToRetirement: number;
} {
  const yearsToRetirement = retirementAge - currentAge;
  
  // Adjust expenses for inflation
  const futureMonthlyExpenses = monthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetirement);
  
  // Total needed in retirement (considering inflation continues)
  const totalMonthsInRetirement = yearsInRetirement * 12;
  let totalNeeded = 0;
  
  for (let year = 0; year < yearsInRetirement; year++) {
    const yearExpense = futureMonthlyExpenses * Math.pow(1 + inflationRate / 100, year) * 12;
    totalNeeded += yearExpense;
  }
  
  // Calculate monthly investment needed (assuming 8% annual return)
  const monthsToRetirement = yearsToRetirement * 12;
  const monthlyRate = 0.08 / 12;
  const futureValueFactor = (Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate;
  const monthlyInvestmentNeeded = totalNeeded / futureValueFactor;
  
  return {
    totalNeeded: Math.round(totalNeeded * 100) / 100,
    monthlyInvestmentNeeded: Math.round(monthlyInvestmentNeeded * 100) / 100,
    yearsToRetirement,
  };
}
