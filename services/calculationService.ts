/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { createYearlyArray } from '../utils.ts';
import type { FinancialData, Product, Asset, FinancingItem, OpCostCategoryKey, OpCostSubItem, PrivateNeed, PrivateNeedSubItem, CalculationResults, MonthlyData, YearData } from '../types.ts';

const roundCurrency = (value: number): number => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 0;
    }
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

const VAT_RATE = 0.19;

export const calculateFinancials = (data: FinancialData | null): CalculationResults | null => {
    if (!data) return null;

    const { settings, products, sales, assets, financing, operationalCosts, startupCosts, privateNeeds } = data;
    const planningYears = Number(settings.planningYears) || 3;
    const foundationDate = settings.foundationDate || new Date().toISOString().split('T')[0];
    const foundationYear = parseInt(foundationDate.substring(0, 4), 10);
    const foundationMonth = parseInt(foundationDate.substring(5, 7), 10) - 1;
    const isVatDeductible = !!settings.isVatDeductible;

    // Cache common values

    // Revenue and Costs Calculations
    const monthlyRevenueNoReservePAndL = createYearlyArray(planningYears, 0);
    const monthlyRevenueWithReservePAndL = createYearlyArray(planningYears, 0);
    const monthlyVariableCostsPAndL = createYearlyArray(planningYears, 0);
    const monthlyRevenueNetCashInflowNoReserve = createYearlyArray(planningYears, 0);
    const monthlyRevenueNetCashInflowWithReserve = createYearlyArray(planningYears, 0);
    const monthlyVatCollectedDelayed = createYearlyArray(planningYears, 0);
    const monthlyVatPaid = createYearlyArray(planningYears, 0); // Vorsteuer
    const monthlyVariableCostsCashOutflow = createYearlyArray(planningYears, 0);

    products.forEach((p: Product) => {
        const salesForProduct = sales[p.id];
        if (!salesForProduct) return;
        const totalVariableCostsPerUnit = (p.materialCosts || 0) + (p.productionCosts || 0) + (p.adminCosts || 0) + (p.marketingSalesCosts || 0) + (p.marginPercentage || 0) + (p.otherCosts || 0);
        const vatRateProduct = (p.vatRate || 0) / 100;
        
        // Assumption: Variable costs (Material etc.) also carry 19% Input VAT (Vorsteuer)
        const costVatRate = VAT_RATE; 

        for (let y = 0; y < planningYears; y++) {
            for (let m = 0; m < 12; m++) {
                if (y === 0 && m < foundationMonth) continue;
                
                const quantity = salesForProduct[y]?.[m] || 0;
                if (quantity <= 0) continue;
                
                const netRevenueForMonth = roundCurrency(quantity * p.targetPrice);
                const varCostsForMonth = roundCurrency(quantity * totalVariableCostsPerUnit);
                const vatForMonth = roundCurrency(netRevenueForMonth * vatRateProduct);
                
                // Calculate Vorsteuer on variable costs
                const costVatForMonth = roundCurrency(varCostsForMonth * costVatRate);

                monthlyVariableCostsPAndL[y][m] += varCostsForMonth;
                
                // If not VAT deductible, the cash outflow is Gross
                monthlyVariableCostsCashOutflow[y][m] += isVatDeductible ? varCostsForMonth : (varCostsForMonth + costVatForMonth);
                
                if (isVatDeductible) {
                    monthlyVatPaid[y][m] += costVatForMonth;
                }
                
                const reservePerc = (p.reservePercentage || 0) / 100;
                const revenueDelayWeeks = p.revenueDelayWeeks || 0;
                
                // Assume sale happens mid-month to avoid edge cases with month lengths and timezones
                const saleDate = new Date(Date.UTC(foundationYear + y, m, 15));

                // Calculate main payment date
                const mainPaymentDate = new Date(saleDate.getTime());
                mainPaymentDate.setUTCDate(mainPaymentDate.getUTCDate() + revenueDelayWeeks * 7);

                const mainTargetYear = mainPaymentDate.getUTCFullYear() - foundationYear;
                const mainTargetMonth = mainPaymentDate.getUTCMonth();

                if (mainTargetYear < planningYears) {
                    const mainRevenuePart = roundCurrency(netRevenueForMonth * (1 - reservePerc));
                    const mainVatPart = roundCurrency(vatForMonth * (1 - reservePerc));

                    monthlyRevenueNoReservePAndL[mainTargetYear][mainTargetMonth] += mainRevenuePart;
                    monthlyRevenueNetCashInflowNoReserve[mainTargetYear][mainTargetMonth] += mainRevenuePart;
                    monthlyVatCollectedDelayed[mainTargetYear][mainTargetMonth] += mainVatPart;
                }

                if (reservePerc > 0) {
                    const reserveDelayWeeks = p.reserveDelayWeeks || 0;
                    
                    // Reserve payment date is based on the main payment date
                    const reservePaymentDate = new Date(mainPaymentDate.getTime());
                    reservePaymentDate.setUTCDate(reservePaymentDate.getUTCDate() + reserveDelayWeeks * 7);

                    const reserveTargetYear = reservePaymentDate.getUTCFullYear() - foundationYear;
                    const reserveTargetMonth = reservePaymentDate.getUTCMonth();

                    if (reserveTargetYear < planningYears) {
                        const reserveRevenuePart = roundCurrency(netRevenueForMonth * reservePerc);
                        const reserveVatPart = roundCurrency(vatForMonth * reservePerc);

                        monthlyRevenueWithReservePAndL[reserveTargetYear][reserveTargetMonth] += reserveRevenuePart;
                        monthlyRevenueNetCashInflowWithReserve[reserveTargetYear][reserveTargetMonth] += reserveRevenuePart;
                        monthlyVatCollectedDelayed[reserveTargetYear][reserveTargetMonth] += reserveVatPart;
                    }
                }
            }
        }
    });

    // Depreciation
    const monthlyDepreciation = createYearlyArray(planningYears, 0);
    assets.forEach((asset: Asset) => {
        if (!asset.purchaseDate || !asset.purchaseDate.includes('-') || asset.usefulLifeYears <= 0 || asset.purchasePrice <= 0) return;
        const [pYear, pMonth] = asset.purchaseDate.split('-').map(Number);
        const totalDepreciationMonths = Math.round(asset.usefulLifeYears * 12);
        if (totalDepreciationMonths === 0) return;
        const monthlyAfa = roundCurrency(asset.purchasePrice / totalDepreciationMonths);
        const startYearIndex = pYear - foundationYear;
        const startMonthIndex = pMonth - 1;
        for (let i = 0; i < totalDepreciationMonths; i++) {
            const currentMonthAbsolute = startMonthIndex + i;
            const y = startYearIndex + Math.floor(currentMonthAbsolute / 12);
            const m = currentMonthAbsolute % 12;
            if (y >= 0 && y < planningYears) {
                monthlyDepreciation[y][m] += monthlyAfa;
            }
        }
    });

    // Investment outflows
    const monthlyInvestmentOutflows = createYearlyArray(planningYears, 0);
    assets.forEach((asset: Asset) => {
        if (!asset.purchaseDate || !asset.purchaseDate.includes('-') || asset.purchasePrice <= 0) return;
        const [pYear, pMonth] = asset.purchaseDate.split('-').map(Number);
        const yIdx = pYear - foundationYear;
        const mIdx = pMonth - 1;
        if (yIdx >= 0 && yIdx < planningYears && mIdx >= 0 && mIdx < 12) {
            // Assume 19% VAT on investments
            const invVat = roundCurrency(asset.purchasePrice * VAT_RATE);
            
            // If not VAT deductible, the purchase cost effectively includes the VAT as an outflow
            monthlyInvestmentOutflows[yIdx][mIdx] += isVatDeductible ? asset.purchasePrice : (asset.purchasePrice + invVat);
            
            if (isVatDeductible) {
                monthlyVatPaid[yIdx][mIdx] += invVat;
            }
        }
    });

    // Financing
    const monthlyInterest = createYearlyArray(planningYears, 0);
    const monthlyRepayment = createYearlyArray(planningYears, 0);
    const monthlyDebtInflows = createYearlyArray(planningYears, 0);

    financing.forEach((fin: FinancingItem) => {
        if (fin.type === 'debt' && fin.startDate && fin.amount > 0) {
            const startDateStr = fin.startDate;
            if (startDateStr && startDateStr.includes('-')) {
                const [loanStartYear, loanStartMonth] = startDateStr.split('-').map(s => parseInt(s, 10));
                const relY = loanStartYear - foundationYear;
                const relM = loanStartMonth - 1;
                if (relY >= 0 && relY < planningYears && relM >= 0 && relM < 12) {
                    monthlyDebtInflows[relY][relM] += fin.amount;
                }
            }
        }
        if (fin.type === 'debt' && fin.startDate && fin.endDate && fin.amount > 0) {
            const sDateStr = fin.startDate;
            const eDateStr = fin.endDate;
            if (sDateStr && sDateStr.includes('-') && eDateStr && eDateStr.includes('-')) {
                const [sYear, sMonth] = sDateStr.split('-').map(s => parseInt(s, 10));
                const [eYear, eMonth] = eDateStr.split('-').map(s => parseInt(s, 10));
                const graceMonths = fin.graceMonths || 0;
                const totalLoanMonths = (eYear - sYear) * 12 + (eMonth - sMonth) + 1;
                if (totalLoanMonths <= 0) return;
                const repaymentMonths = totalLoanMonths - graceMonths;
                const monthlyRate = fin.interestRate / 100 / 12;
                const monthlyPrincipalRepayment = repaymentMonths > 0 ? roundCurrency(fin.amount / repaymentMonths) : 0;
                let balance = fin.amount;
                let loanMonthCounter = 0;
                for (let y = 0; y < planningYears; y++) {
                    const currentCalYear = foundationYear + y;
                    for (let m = 0; m < 12; m++) {
                        const currentCalMonth = m + 1;
                        const isLoanPeriod = (currentCalYear > sYear || (currentCalYear === sYear && currentCalMonth >= sMonth)) && (currentCalYear < eYear || (currentCalYear === eYear && currentCalMonth <= eMonth));
                        if (isLoanPeriod && balance > 0.01) {
                            const interest = roundCurrency(balance * monthlyRate);
                            let repayment = 0;
                            loanMonthCounter++;
                            if (loanMonthCounter > graceMonths) {
                                repayment = monthlyPrincipalRepayment;
                            }
                            const finalRepayment = Math.max(0, Math.min(repayment, balance));
                            monthlyInterest[y][m] += interest;
                            monthlyRepayment[y][m] += finalRepayment;
                            balance = roundCurrency(balance - finalRepayment);
                        }
                    }
                }
            }
        }
    });

    const equityInflow = financing.filter((f: FinancingItem) => f.type === 'equity').reduce((sum: number, f: FinancingItem) => sum + f.amount, 0);
    const [foundY, foundM] = foundationDate.split('-').map(Number);
    const yTargetIdx = foundY - foundationYear;
    const mTargetIdx = foundM - 1;
    const equityInflowArray = createYearlyArray(planningYears, 0);
    if (yTargetIdx >= 0 && yTargetIdx < planningYears) equityInflowArray[yTargetIdx][mTargetIdx] = equityInflow;
    
    // Operational Costs
    const isSoleProprietor = settings.legalForm === 'sole_proprietorship' || settings.legalForm === 'freelance' || settings.legalForm === 'Gewerbe (Einzelunternehmen)' || settings.legalForm === 'Freiberufliche Selbstständigkeit';
    
    const opCostKeys: OpCostCategoryKey[] = [
        'managementSalary', 'personnelCosts', 'rentAndFacilities', 'officeSupplies', 'vehicleExpenses',
        'advertisingCosts', 'insuranceAndFees', 'consultingCosts', 'travelExpenses', 'otherOperatingExpenses'
    ];
    const calculatedOpCosts: Record<OpCostCategoryKey, number[][]> = {} as Record<OpCostCategoryKey, number[][]>;

    opCostKeys.forEach(key => {
        if (isSoleProprietor && key === 'managementSalary') return;
        
        calculatedOpCosts[key] = createYearlyArray(planningYears, 0);
        const category = operationalCosts[key];
        if (!category) return;
        
        // Define VAT rates for categories
        // 0% for salaries and insurance
        const vatExempt: OpCostCategoryKey[] = ['managementSalary', 'personnelCosts', 'insuranceAndFees'];
        const opCostVatRate = vatExempt.includes(key) ? 0 : VAT_RATE;

        for (let y = 0; y < planningYears; y++) {
            for (let m = 0; m < 12; m++) {
                if (y === 0 && m < foundationMonth) continue;

                let monthValue = 0;
                const useSubItems = category.subItems && category.subItems.length > 0;
    
                if (useSubItems) {
                    monthValue = category.subItems.reduce((sum: number, item: OpCostSubItem) => sum + (item.costs[y]?.[m] || 0), 0);
                } else {
                    monthValue = category.directCosts[y]?.[m] || 0;
                }
    
                if (key === 'otherOperatingExpenses' && y === 0 && m === foundationMonth) {
                    const vatRelevantStartup = (startupCosts.inventoryMaterial || 0) + (startupCosts.rndOthers || 0) + (startupCosts.startupConsulting || 0) + (startupCosts.marketingTravel || 0) + (startupCosts.licensesAndOthers || 0);
                    const startupVat = roundCurrency(vatRelevantStartup * VAT_RATE);
                    
                    if (isVatDeductible) {
                        monthlyVatPaid[y][m] += startupVat;
                    }
                }
                
                const catVat = roundCurrency(monthValue * opCostVatRate);
                calculatedOpCosts[key][y][m] = isVatDeductible ? monthValue : (monthValue + catVat);
                
                if (isVatDeductible) {
                    monthlyVatPaid[y][m] += catVat;
                }
            }
        }
    });
    
    // Private Withdrawals (Only for Sole Proprietors)
    const privateWithdrawalsArray = createYearlyArray(planningYears, 0);
    
    if (isSoleProprietor) {
        privateNeeds.forEach((need: PrivateNeed) => {
            for (let y = 0; y < planningYears; y++) {
                for (let m = 0; m < 12; m++) {
                    if (y === 0 && m < foundationMonth) continue;
                    
                    let monthValue = 0;
                    const useSubItems = need.subItems && need.subItems.length > 0;
                    if (useSubItems) {
                        monthValue = need.subItems.reduce((sum: number, item: PrivateNeedSubItem) => sum + (item.costs[y]?.[m] || 0), 0);
                    } else {
                        monthValue = need.directCosts[y]?.[m] || 0;
                    }
                    privateWithdrawalsArray[y][m] += monthValue;
                }
            }
        });
    }

    // Final Assembly
    const monthly: MonthlyData[][] = Array.from({ length: planningYears }, () => Array.from({ length: 12 }, () => ({
        revenueNoReserve: 0, revenueWithReserve: 0, totalRevenue: 0, variableCosts: 0, operationalCosts: 0, depreciation: 0,
        interest: 0, profitBeforeTax: 0, taxAmount: 0, profitAfterTax: 0, privateWithdrawals: 0, remainingCashflow: 0
    })));

    const taxRate = (settings.taxRate || 0) / 100;
    let taxLossCarryforward = 0;

    for (let y = 0; y < planningYears; y++) {
        for (let m = 0; m < 12; m++) {
            monthly[y][m].revenueNoReserve = monthlyRevenueNoReservePAndL[y][m];
            monthly[y][m].revenueWithReserve = monthlyRevenueWithReservePAndL[y][m];
            monthly[y][m].totalRevenue = roundCurrency(monthlyRevenueNoReservePAndL[y][m] + monthlyRevenueWithReservePAndL[y][m]);
            monthly[y][m].variableCosts = monthlyVariableCostsPAndL[y][m];
            monthly[y][m].depreciation = monthlyDepreciation[y][m];
            monthly[y][m].interest = monthlyInterest[y][m];
            let monthOpCosts = 0;
            opCostKeys.forEach(key => {
                const currentYearOpCosts = calculatedOpCosts[key];
                if (currentYearOpCosts && currentYearOpCosts[y]) {
                    monthOpCosts += currentYearOpCosts[y][m];
                }
            });
            monthly[y][m].operationalCosts = roundCurrency(monthOpCosts);
            
            const pbt = roundCurrency(monthly[y][m].totalRevenue - monthly[y][m].variableCosts - monthOpCosts - monthly[y][m].depreciation - monthly[y][m].interest);
            monthly[y][m].profitBeforeTax = pbt;
            
            // Tax Loss Carryforward logic
            if (pbt < 0) {
                taxLossCarryforward += Math.abs(pbt);
                monthly[y][m].taxAmount = 0;
            } else {
                const taxableAmount = Math.max(0, pbt - taxLossCarryforward);
                taxLossCarryforward = Math.max(0, taxLossCarryforward - pbt);
                monthly[y][m].taxAmount = roundCurrency(taxableAmount * taxRate);
            }
            
            monthly[y][m].profitAfterTax = roundCurrency(pbt - monthly[y][m].taxAmount);

            // Add private withdrawals for Sole Proprietors or as a memo item
            const pw = privateWithdrawalsArray[y][m];
            monthly[y][m].privateWithdrawals = pw;
            monthly[y][m].remainingCashflow = roundCurrency(monthly[y][m].profitAfterTax - pw + monthly[y][m].depreciation);
        }
    }
    
    const cashFlow = {
        revenueNet: monthlyRevenueNetCashInflowNoReserve.map((y, yi) => y.map((m, mi) => {
            const reserveValue = monthlyRevenueNetCashInflowWithReserve[yi] ? monthlyRevenueNetCashInflowWithReserve[yi][mi] : 0;
            return roundCurrency(m + reserveValue);
        })),
        vatCollected: monthlyVatCollectedDelayed,
        vatPaid: monthlyVatPaid,
        variableCosts: monthlyVariableCostsCashOutflow,
        opCosts: calculatedOpCosts,
        interestPayments: monthlyInterest,
        vatPayments: createYearlyArray(planningYears, 0),
        repayments: monthlyRepayment,
        privateWithdrawals: privateWithdrawalsArray,
        equityInflow: equityInflowArray,
        debtInflow: monthlyDebtInflows,
        investmentOutflows: monthlyInvestmentOutflows,
        accumulatedLiquidity: createYearlyArray(planningYears, 0),
    };

    for (let y = 0; y < planningYears; y++) {
        for (let m = 0; m < 12; m++) {
            // Net VAT Payment (Umsatzsteuer minus Vorsteuer)
            const netVat = roundCurrency(monthlyVatCollectedDelayed[y][m] - monthlyVatPaid[y][m]);
            // Pay it in the next month
            const nextM = (m + 1) % 12;
            const nextY = y + Math.floor((m + 1) / 12);
            if (nextY < planningYears) {
                cashFlow.vatPayments[nextY][nextM] = netVat;
            }
        }
    }

    let currentBalance = 0;
    for (let y = 0; y < planningYears; y++) {
        for (let m = 0; m < 12; m++) {
            const laufendeEinzahlungen = cashFlow.revenueNet[y][m] + cashFlow.vatCollected[y][m];
            const opCostsMonth = monthly[y][m].operationalCosts;
            const laufendeAuszahlungen = cashFlow.variableCosts[y][m] + opCostsMonth + cashFlow.interestPayments[y][m] + cashFlow.vatPayments[y][m];
            const investitionsEinzahlungen = cashFlow.equityInflow[y][m] + cashFlow.debtInflow[y][m];
            const finanzPrivatAuszahlungen = cashFlow.repayments[y][m] + (isSoleProprietor ? cashFlow.privateWithdrawals[y][m] : 0);
            const totalInflows = laufendeEinzahlungen + investitionsEinzahlungen;
            const totalOutflows = laufendeAuszahlungen + cashFlow.investmentOutflows[y][m] + finanzPrivatAuszahlungen;
            currentBalance = roundCurrency(currentBalance + totalInflows - totalOutflows);
            cashFlow.accumulatedLiquidity[y][m] = currentBalance;
        }
    }
    
    const yearly: YearData[] = Array(planningYears).fill(null).map((_, y) => {
        const yearData = {
            revenue: roundCurrency(monthly[y].reduce((s, m) => s + m.totalRevenue, 0)),
            variableCosts: roundCurrency(monthly[y].reduce((s, m) => s + m.variableCosts, 0)),
            operationalCosts: roundCurrency(monthly[y].reduce((s, m) => s + m.operationalCosts, 0)),
            depreciation: roundCurrency(monthly[y].reduce((s, m) => s + m.depreciation, 0)),
            interest: roundCurrency(monthly[y].reduce((s, m) => s + m.interest, 0)),
            taxAmount: roundCurrency(monthly[y].reduce((s, m) => s + m.taxAmount, 0)),
            privateWithdrawals: roundCurrency(cashFlow.privateWithdrawals[y].reduce((a,b)=>a+b,0)),
            endBalance: cashFlow.accumulatedLiquidity[y][11]
        };
        const grossProfit = roundCurrency(yearData.revenue - yearData.variableCosts);
        const profitBeforeTax = roundCurrency(grossProfit - yearData.operationalCosts - yearData.depreciation - yearData.interest);
        const profitAfterTax = roundCurrency(profitBeforeTax - yearData.taxAmount);
        const netCashFlow = roundCurrency(cashFlow.accumulatedLiquidity[y][11] - (y > 0 ? cashFlow.accumulatedLiquidity[y-1][11] : 0));
        return { 
            ...yearData, 
            grossProfit, 
            profitBeforeTax, 
            profitAfterTax, 
            netCashFlow,
            returnOnSales: yearData.revenue > 0 ? roundCurrency((profitBeforeTax / yearData.revenue) * 100) : 0,
            breakEvenRevenue: 0, // Placeholder, calculated properly below
            cashBreakEvenRevenue: 0,
            roi: 0
        };
    });

    const totalEquity = financing.filter(f => f.type === 'equity').reduce((sum, f) => sum + f.amount, 0);

    yearly.forEach((yearData) => {
        // Break-Even calculations
        const fixedCosts = yearData.operationalCosts + yearData.depreciation + yearData.interest;
        const cashFixedCosts = yearData.operationalCosts + yearData.interest;
        
        const margin = yearData.revenue - yearData.variableCosts;
        const contributionMarginRatio = yearData.revenue > 0 ? margin / yearData.revenue : 0;
        
        yearData.breakEvenRevenue = contributionMarginRatio > 0 ? roundCurrency(fixedCosts / contributionMarginRatio) : 0;
        yearData.cashBreakEvenRevenue = contributionMarginRatio > 0 ? roundCurrency(cashFixedCosts / contributionMarginRatio) : 0;

        yearData.roi = totalEquity > 0 ? roundCurrency((yearData.profitBeforeTax / totalEquity) * 100) : 0;
    });

    const totalRevenue = roundCurrency(yearly.reduce((sum, y) => sum + y.revenue, 0));
    const totalProfit = roundCurrency(yearly.reduce((sum, y) => sum + y.profitBeforeTax, 0));

    let paybackMonths = -1;
    if (totalEquity > 0) {
        let cumulativeCFO = 0;
        let found = false;
        for (let y = 0; y < planningYears && !found; y++) {
            for (let m = 0; m < 12 && !found; m++) {
                const laufendeEinzahlungen = cashFlow.revenueNet[y][m] + cashFlow.vatCollected[y][m];
                const opCostsMonth = monthly[y][m].operationalCosts;
                const laufendeAuszahlungen = cashFlow.variableCosts[y][m] + opCostsMonth + cashFlow.interestPayments[y][m] + cashFlow.vatPayments[y][m];
                const monthlyCFO = roundCurrency(laufendeEinzahlungen - laufendeAuszahlungen);
                cumulativeCFO = roundCurrency(cumulativeCFO + monthlyCFO);

                if (cumulativeCFO >= totalEquity) {
                    const totalMonthsSinceFoundation = (y * 12 + m) - foundationMonth;
                    paybackMonths = totalMonthsSinceFoundation + 1;
                    found = true;
                }
            }
        }
    }
    
    const totalOverview = {
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        totalEquity: totalEquity,
        averageROS: totalRevenue > 0 ? roundCurrency((totalProfit / totalRevenue) * 100) : 0,
        finalROI: totalEquity > 0 ? roundCurrency((totalProfit / totalEquity) * 100) : 0,
        paybackMonths: paybackMonths,
    };

    return { yearly, monthly, cashFlow, totalOverview };
};