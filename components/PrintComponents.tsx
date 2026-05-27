/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils.ts';
import { createYearlyArray } from '../utils.ts';
import type { FinancialData, Product, Asset, FinancingItem, PrivateNeed, OpCostCategoryKey, CompanySettings, SalesData, CalculationResults } from '../types.ts';
import { BankenStatistik } from '../views/statistik/BankenStatistik.tsx';
import { InvestorenStatistik } from '../views/statistik/InvestorenStatistik.tsx';
import { FoerdergeberStatistik } from '../views/statistik/FoerdergeberStatistik.tsx';
import { Szenariovergleich } from '../views/statistik/Szenariovergleich.tsx';
import { LineChart } from '../components/LineChart.tsx';


// --- PRINTING COMPONENTS ---
const PrintHeader = ({ projectName }: { projectName: string }) => {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return (
        <header className="print-header">
            <div className="print-header-text">
                <h1>{t('print.header.title', { projectName })}</h1>
                <p>{t('print.header.created_at', { date: new Date().toLocaleString(dateLocale, { dateStyle: 'long', timeStyle: 'short' }) })}</p>
            </div>
        </header>
    );
};

const PrintPageWrapper = ({ title, children, isFirstPage = false, className }: { title: string, children: React.ReactNode, isFirstPage?: boolean, className?: string }) => (
    <div className={`print-page ${isFirstPage ? 'print-page-first' : ''} ${className || ''}`}>
        <h2 className="print-page-title">{title}</h2>
        {children}
    </div>
);

type PrintCell = string | number | { value: string | number; align?: 'right' | 'left' | 'center'; className?: string };

export const PrintTable = ({ headers, rows, footer, tableClassName }: { headers: (string|number)[], rows: PrintCell[][], footer?: PrintCell[], tableClassName?: string }) => (
    <table className={`print-table ${tableClassName || ''}`}>
        <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
            {rows.map((row, i) => (
                <tr key={i}>
                    {row.map((cell, j) => {
                        const isObject = typeof cell === 'object' && cell !== null && cell.value !== undefined;
                        const value = isObject ? cell.value : cell;
                        const isNumeric = typeof value === 'number';

                        const classNames = [
                            (j > 0 && (isNumeric || (isObject && cell.align === 'right'))) ? 'text-right' : '',
                            isObject ? cell.className : '',
                        ].filter(Boolean).join(' ');
                        
                        let content: React.ReactNode = isNumeric ? formatCurrency(value as number) : String(value);
                        
                        return (
                            <td key={j} className={classNames}>
                                {content}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
        {footer && (
            <tfoot>
                <tr className="total-row">
                    {footer.map((cell, j) => {
                         const isObject = typeof cell === 'object' && cell !== null && cell.value !== undefined;
                        const value = isObject ? cell.value : cell;
                        const isNumeric = typeof value === 'number';

                        const classNames = [
                            (j > 0 && (isNumeric || (isObject && cell.align === 'right'))) ? 'text-right' : '',
                            isObject ? cell.className : '',
                        ].filter(Boolean).join(' ');

                        let content: React.ReactNode = isNumeric ? formatCurrency(value as number) : String(value);
                        
                        return (
                             <td key={j} className={classNames}>
                                {content}
                            </td>
                        );
                    })}
                </tr>
            </tfoot>
        )}
    </table>
);

const PrintFirstPage = ({ data, calculations }: { data: FinancialData, calculations: CalculationResults }) => {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    const { settings } = data;
    const { yearly } = calculations;
    const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);
    const planningYears = settings.planningYears || 3;
    const maxYearsToShow = Math.min(planningYears, 6);

    return (
        <div className="print-page print-page-first">
            <div className="print-stammdaten-section">
                <h2 className="print-page-title">{t('print.stammdaten.title')}</h2>
                <table className="stammdaten-table">
                    <tbody>
                        <tr><td>{t('print.stammdaten.project_name')}</td><td>{settings.title}</td></tr>
                        <tr><td>{t('print.stammdaten.company_name')}</td><td>{settings.companyName}</td></tr>
                        <tr><td>{t('print.stammdaten.legal_form')}</td><td>{settings.legalForm}</td></tr>
                        <tr><td>{t('print.stammdaten.foundation_date')}</td><td>{new Date(settings.foundationDate).toLocaleDateString(dateLocale, {day: '2-digit', month: '2-digit', year: 'numeric'})}</td></tr>
                        <tr><td>{t('print.stammdaten.planning_years')}</td><td>{settings.planningYears}</td></tr>
                    </tbody>
                </table>
            </div>

            <div className="print-overview-grid">
                {[...Array(maxYearsToShow).keys()].map(year => {
                    const yearData = yearly[year];
                    if (!yearData) return null;
                    const rows = [
                        [t('print.guv.revenue'), yearData.revenue],
                        [t('print.guv.gross_profit'), yearData.grossProfit],
                        [t('print.guv.operating_expenses'), yearData.operationalCosts],
                        [t('print.guv.depreciation'), yearData.depreciation],
                        [t('print.guv.interest'), yearData.interest],
                        [t('print.guv.ebt'), yearData.profitBeforeTax],
                        [t('print.guv.net_cash_flow'), yearData.netCashFlow],
                        [t('print.guv.private_withdrawal'), yearData.privateWithdrawals],
                    ];
                    return (
                        <div key={year} className="print-overview-item">
                            <h3>{t('print.overview.title', { yearValue: foundationYear + year, yearNumber: year + 1 })}</h3>
                            <PrintTable headers={[t('print.table.description'), '']} rows={rows} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const PrintJahresplan = ({ title, settings, rowLabels, yearlyData, sumRows, showInactiveMonths }: { title: string, settings: CompanySettings, rowLabels: string[], yearlyData: number[][][], sumRows: boolean, showInactiveMonths: boolean }) => {
    const { t } = useTranslation();
    const planningYears = settings.planningYears || 3;
    const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);
    
    return (
        <PrintPageWrapper title={title}>
            {[...Array(planningYears).keys()].map(year => {
                const foundationMonth = showInactiveMonths ? -1 : (parseInt(settings.foundationDate.substring(5, 7), 10) - 1);
                const visibleMonths = Array.from({ length: 12 }, (_, i) => i).filter(m => !(year === 0 && m < foundationMonth));
                
                const monthLabels = t('common.months', { returnObjects: true }) as string[];
                const headers = [t('print.table.category'), ...visibleMonths.map(m => monthLabels[m]), t('print.table.total')];
                
                const rows = rowLabels.map((label, rowIndex) => {
                    const monthValues = visibleMonths.map(month => yearlyData[rowIndex]?.[year]?.[month] || 0);
                    const total = monthValues.reduce((a, b) => a + b, 0);
                    return [label, ...monthValues, total];
                });
                
                let footer;
                if (sumRows) {
                    const monthSums = visibleMonths.map(m => rowLabels.reduce((sum, _, rowIndex) => sum + (yearlyData[rowIndex]?.[year]?.[m] || 0), 0));
                    const totalSum = monthSums.reduce((a, b) => a + b, 0);
                    footer = [t('print.table.monthly_sum'), ...monthSums, totalSum];
                }

                return (
                    <div key={year} className="print-year-section">
                        <h3>{t('print.years.title', { title, yearNumber: year + 1, yearValue: foundationYear + year })}</h3>
                        <PrintTable headers={headers} rows={rows} footer={footer} />
                    </div>
                );
            })}
        </PrintPageWrapper>
    );
};

const PrintPrivatbedarfsplan = ({ data, settings }: { data: PrivateNeed[], settings: CompanySettings }) => {
    const { t } = useTranslation();
    const yearlyData = data.map(d => {
        const useSubItems = d.subItems && d.subItems.length > 0;
        if (useSubItems) {
            const planningYears = settings.planningYears || 3;
            const totalCosts = createYearlyArray(planningYears, 0);
            for(let y=0; y<planningYears; y++) {
                for(let m=0; m<12; m++) {
                    totalCosts[y][m] = d.subItems.reduce((sum, item) => sum + (item.costs[y]?.[m] || 0), 0);
                }
            }
            return totalCosts;
        } else {
            return d.directCosts;
        }
    });

    return (
        <PrintJahresplan 
            title={t('views.privatbedarf')}
            settings={settings}
            rowLabels={data.map(d => d.category)}
            yearlyData={yearlyData}
            sumRows={true}
            showInactiveMonths={false}
        />
    );
};

const PrintFinanzierungsplan = ({ data }: { data: FinancingItem[] }) => {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    const equityRows = data.filter(d => d.type === 'equity').map(d => [d.source, d.amount]);
    const debtRows = data.filter(d => d.type === 'debt').map(d => [d.source, d.amount, { value: d.interestRate, align: 'right' as const }, { value: d.graceMonths || 0, align: 'right' as const }, d.startDate ? new Date(d.startDate).toLocaleDateString(dateLocale) : '', d.endDate ? new Date(d.endDate).toLocaleDateString(dateLocale) : '']);
    return (
        <PrintPageWrapper title={t('print.finanzierung.title')}>
            <div className="print-year-section">
                <h3>{t('print.finanzierung.equity')}</h3>
                <PrintTable headers={[t('print.finanzierung.source'), t('print.finanzierung.amount_eur')]} rows={equityRows} />
            </div>
            <div className="print-year-section">
                <h3>{t('print.finanzierung.debt')}</h3>
                <PrintTable headers={[t('print.finanzierung.source'), t('print.finanzierung.amount_eur'), t('print.finanzierung.interest_percent'), t('print.finanzierung.grace_months'), t('print.finanzierung.start'), t('print.finanzierung.end')]} rows={debtRows} />
            </div>
        </PrintPageWrapper>
    );
};

const PrintProduktPreiskalkulation = ({ data }: { data: Product[] }) => {
    const { t } = useTranslation();
    return (
        <PrintPageWrapper title={t('print.umsatzkalkulation.title')}>
            <div className="print-product-grid">
                {data.map(p => {
                    const costKeys: (keyof Product)[] = ['materialCosts', 'productionCosts', 'adminCosts', 'marketingSalesCosts', 'marginPercentage', 'otherCosts'];
                    const totalVariableCosts = costKeys.reduce((sum, key) => sum + (p[key] as number), 0);
                    const rohgewinn = p.targetPrice - totalVariableCosts;
                    const rows: PrintCell[][] = [
                        [t('print.umsatzkalkulation.price_net'), p.targetPrice],
                        [t('print.umsatzkalkulation.vat_percent'), { value: p.vatRate, align: 'right' as const }],
                        [t('print.umsatzkalkulation.price_gross'), p.targetPrice * (1 + p.vatRate / 100)],
                        [t('produktkalkulation_details.material_costs'), p.materialCosts],
                        [t('produktkalkulation_details.production_costs'), p.productionCosts],
                        [t('produktkalkulation_details.admin_costs'), p.adminCosts],
                        [t('produktkalkulation_details.marketing_sales_costs'), p.marketingSalesCosts],
                        [t('produktkalkulation_details.margin'), p.marginPercentage],
                        [t('produktkalkulation_details.other_costs'), p.otherCosts],
                        [t('print.umsatzkalkulation.total_var_costs'), totalVariableCosts],
                        [t('print.umsatzkalkulation.gross_margin'), rohgewinn]
                    ];
                    return (
                        <div key={p.id} className="print-year-section">
                            <h3>{t('print.umsatzkalkulation.product_title', { name: p.name })}</h3>
                            <PrintTable headers={[t('print.table.description'), '']} rows={rows}/>
                        </div>
                    );
                })}
            </div>
        </PrintPageWrapper>
    );
};

const PrintAbsatzplan = ({ products, sales, settings }: { products: Product[], sales: SalesData, settings: CompanySettings }) => {
    const { t } = useTranslation();
    const yearlyData = products.map(p => sales[p.id] || createYearlyArray(settings.planningYears, 0));
    return (
        <PrintJahresplan
            title={t('print.absatzplan.title')}
            settings={settings}
            rowLabels={products.map(p => p.name)}
            yearlyData={yearlyData}
            sumRows={false}
            showInactiveMonths={false}
        />
    );
};

const PrintAbschreibungsplan = ({ data }: { data: Asset[] }) => {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return (
        <PrintPageWrapper title={t('print.abschreibungsplan.title')}>
            <PrintTable 
                headers={[t('print.abschreibungsplan.asset'), t('print.abschreibungsplan.amount_eur'), t('print.abschreibungsplan.afa_category'), t('print.abschreibungsplan.useful_life'), t('print.abschreibungsplan.purchase_date'), t('print.abschreibungsplan.annual_afa')]}
                rows={data.map(a => [a.name, a.purchasePrice, a.depreciationCategory, { value: a.usefulLifeYears, align: 'right' as const }, new Date(a.purchaseDate).toLocaleDateString(dateLocale), a.usefulLifeYears > 0 ? a.purchasePrice / a.usefulLifeYears : 0])}
            />
        </PrintPageWrapper>
    );
};

const PrintGuV = ({ data, calculations }: { data: FinancialData, calculations: CalculationResults }) => {
    const { t } = useTranslation();
    const { settings } = data;
    const { monthly } = calculations;
    const planningYears = settings.planningYears;
    const foundationYear = new Date(settings.foundationDate).getFullYear();

    const isSoleProprietor = data.settings.legalForm === 'Gewerbe (Einzelunternehmen)' || data.settings.legalForm === 'Freiberufliche Selbstständigkeit';
    
    const costCategories: { key: OpCostCategoryKey, label: string }[] = ([
        { key: 'managementSalary', label: t('operational_costs.ceo_salaries') },
        { key: 'personnelCosts', label: t('operational_costs.personnel') },
        { key: 'rentAndFacilities', label: t('operational_costs.facility_costs') },
        { key: 'officeSupplies', label: t('operational_costs.office_costs') },
        { key: 'vehicleExpenses', label: t('operational_costs.vehicle_costs') },
        { key: 'advertisingCosts', label: t('operational_costs.advertising_costs') },
        { key: 'insuranceAndFees', label: t('operational_costs.insurance') },
        { key: 'consultingCosts', label: t('operational_costs.consulting_costs') },
        { key: 'travelExpenses', label: t('operational_costs.travel_costs') },
        { key: 'otherOperatingExpenses', label: t('operational_costs.other_expenses') },
    ] as { key: OpCostCategoryKey, label: string }[]).filter(cat => {
        if (isSoleProprietor && cat.key === 'managementSalary') return false;
        return true;
    });

    return (
        <PrintPageWrapper title={t('print.guv.title')}>
            {[...Array(planningYears).keys()].map(year => {
                 const monthLabels = t('common.months', { returnObjects: true }) as string[];
                 const headers = [t('print.guv.position'), ...monthLabels, t('print.table.total')];
                 const yearSum = (arr: number[]) => arr.reduce((a,b) => a+b, 0);

                 const rows: (string|number)[][] = [];
                 
                 const totalRevenue = monthly[year].map(m => m.totalRevenue);
                 const varCosts = monthly[year].map(m => m.variableCosts);
                 const grossProfit = monthly[year].map((_, i: number) => totalRevenue[i] - varCosts[i]);
                 rows.push([t('print.guv.revenue'), ...totalRevenue, yearSum(totalRevenue)]);
                 rows.push([t('print.guv.material_costs'), ...varCosts, yearSum(varCosts)]);
                 rows.push([t('print.guv.gross_profit'), ...grossProfit, yearSum(grossProfit)]);

                 rows.push([t('print.guv.operating_expenses'), ...Array(13).fill('')]); // Spacer
                 const totalOpEx = monthly[year].map(m => m.operationalCosts);
                 costCategories.forEach(cat => {
                     const catData = (calculations.cashFlow.opCosts[cat.key] || [])[year] || Array(12).fill(0);
                     rows.push([`${cat.label}`, ...catData, yearSum(catData)]);
                 });
                 rows.push([t('print.guv.sum_operating_expenses'), ...totalOpEx, yearSum(totalOpEx)]);

                 const depreciation = monthly[year].map(m => m.depreciation);
                 const ebit = monthly[year].map(m => m.profitBeforeTax + m.interest);
                 rows.push([t('print.guv.depreciation'), ...depreciation, yearSum(depreciation)]);
                 rows.push([t('print.guv.ebit'), ...ebit, yearSum(ebit)]);

                 const interest = monthly[year].map(m => m.interest);
                 const ebt = monthly[year].map(m => m.profitBeforeTax);
                 const tax = monthly[year].map(m => m.taxAmount);
                 const eat = monthly[year].map(m => m.profitAfterTax);
                 const pw = monthly[year].map(m => m.privateWithdrawals || 0);
                 const remaining = monthly[year].map(m => m.profitAfterTax - (m.privateWithdrawals || 0));

                 rows.push([t('print.guv.interest'), ...interest, yearSum(interest)]);
                 rows.push([t('print.guv.ebt'), ...ebt, yearSum(ebt)]);
                 rows.push([t('print.guv.tax'), ...tax, yearSum(tax)]);
                 rows.push([t('print.guv.eat'), ...eat, yearSum(eat)]);
                 
                 if (isSoleProprietor) {
                    rows.push([t('print.guv.private_withdrawal'), ...pw, yearSum(pw)]);
                    rows.push([t('print.guv.remaining'), ...remaining, yearSum(remaining)]);
                 }
                 
                 return (
                     <div key={year} className="print-year-section">
                        <h3>{t('print.years.title', { title: t('print.guv.title'), yearNumber: year + 1, yearValue: foundationYear + year })}</h3>
                        <PrintTable headers={headers} rows={rows} />
                     </div>
                 );
            })}
        </PrintPageWrapper>
    );
};

const PrintLiquiditaetsplan = ({ calculations, settings }: { calculations: CalculationResults, settings: CompanySettings }) => {
    const { t } = useTranslation();
    const { cashFlow } = calculations;
    const planningYears = settings.planningYears || 3;
    const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);

    return (
        <PrintPageWrapper title={t('print.liquiditaet.title')}>
            {[...Array(planningYears).keys()].map(yearIndex => {
                const monthLabels = t('common.months', { returnObjects: true }) as string[];
                const headers = [t('print.guv.position'), ...monthLabels, t('print.table.total')];
                const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

                const rows: (string|number)[][] = [];

                const sumLaufendeEinzahlungen = Array(12).fill(0).map((_, m) => cashFlow.revenueNet[yearIndex][m] + cashFlow.vatCollected[yearIndex][m]);
        
                let opCostsSum = Array(12).fill(0);
                Object.values(cashFlow.opCosts).forEach(costs => {
                    if (!costs || !costs[yearIndex]) return;
                    costs[yearIndex].forEach((val: number, m: number) => opCostsSum[m] += val);
                });
        
                const sumLaufendeAuszahlungen = Array(12).fill(0).map((_, m) => 
                    cashFlow.variableCosts[yearIndex][m] +
                    opCostsSum[m] +
                    cashFlow.interestPayments[yearIndex][m] +
                    (cashFlow.vatPaid?.[yearIndex][m] || 0) +
                    cashFlow.vatPayments[yearIndex][m]
                );
                
                const isSoleProprietor = settings.legalForm === 'Gewerbe (Einzelunternehmen)' || settings.legalForm === 'Freiberufliche Selbstständigkeit';
                const isVatDeductible = !!settings.isVatDeductible;
                
                const opCostItems: {label: string, values: number[]}[] = ([
                    { label: t('operational_costs.ceo_salaries'), values: (cashFlow.opCosts.managementSalary || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.personnel'), values: (cashFlow.opCosts.personnelCosts || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.facility_costs'), values: (cashFlow.opCosts.rentAndFacilities || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.office_costs'), values: (cashFlow.opCosts.officeSupplies || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.vehicle_costs'), values: (cashFlow.opCosts.vehicleExpenses || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.advertising_costs'), values: (cashFlow.opCosts.advertisingCosts || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.insurance'), values: (cashFlow.opCosts.insuranceAndFees || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.consulting_costs'), values: (cashFlow.opCosts.consultingCosts || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.travel_costs'), values: (cashFlow.opCosts.travelExpenses || [])[yearIndex] || Array(12).fill(0) },
                    { label: t('operational_costs.other_expenses'), values: (cashFlow.opCosts.otherOperatingExpenses || [])[yearIndex] || Array(12).fill(0) },
                ] as {label: string, values: number[]}[]).filter(item => {
                    const ceoSalariesLabel = t('operational_costs.ceo_salaries');
                    if (isSoleProprietor && item.label === ceoSalariesLabel) return false;
                    return true;
                });
                
                const saldoLfdLiquiditaet = Array(12).fill(0).map((_, m) => {
                    const kumulierte = cashFlow.accumulatedLiquidity[yearIndex][m];
                    const prevKumulierte = m > 0 ? cashFlow.accumulatedLiquidity[yearIndex][m-1] : (yearIndex > 0 ? cashFlow.accumulatedLiquidity[yearIndex-1][11] : 0);
                    return kumulierte - prevKumulierte;
                });

                rows.push([t('print.liquiditaet.inflows'), ...Array(13).fill('')]);
                rows.push([t('print.liquiditaet.revenue_net'), ...cashFlow.revenueNet[yearIndex], sum(cashFlow.revenueNet[yearIndex])]);
                rows.push([t('print.liquiditaet.vat_collected'), ...cashFlow.vatCollected[yearIndex], sum(cashFlow.vatCollected[yearIndex])]);
                rows.push([t('print.liquiditaet.sum_inflows'), ...sumLaufendeEinzahlungen, sum(sumLaufendeEinzahlungen)]);

                rows.push([t('print.liquiditaet.outflows'), ...Array(13).fill('')]);
                rows.push([t('print.liquiditaet.var_costs'), ...cashFlow.variableCosts[yearIndex], sum(cashFlow.variableCosts[yearIndex])]);
                opCostItems.forEach(item => {
                    rows.push([`${item.label}`, ...item.values, sum(item.values)]);
                });
                rows.push([t('print.liquiditaet.interest_payments'), ...cashFlow.interestPayments[yearIndex], sum(cashFlow.interestPayments[yearIndex])]);
                if (isVatDeductible && cashFlow.vatPaid) {
                    rows.push([t('print.liquiditaet.vat_paid'), ...cashFlow.vatPaid[yearIndex], sum(cashFlow.vatPaid[yearIndex])]);
                }
                rows.push([t('print.liquiditaet.vat_payments'), ...cashFlow.vatPayments[yearIndex], sum(cashFlow.vatPayments[yearIndex])]);
                rows.push([t('print.liquiditaet.sum_outflows'), ...sumLaufendeAuszahlungen, sum(sumLaufendeAuszahlungen)]);

                rows.push([t('print.liquiditaet.investment_financing'), ...Array(13).fill('')]);
                rows.push([t('print.liquiditaet.equity_inflow'), ...cashFlow.equityInflow[yearIndex], sum(cashFlow.equityInflow[yearIndex])]);
                rows.push([t('print.liquiditaet.debt_inflow'), ...cashFlow.debtInflow[yearIndex], sum(cashFlow.debtInflow[yearIndex])]);
                rows.push([t('print.liquiditaet.investment_outflow'), ...cashFlow.investmentOutflows[yearIndex], sum(cashFlow.investmentOutflows[yearIndex])]);
                rows.push([t('print.liquiditaet.repayments'), ...cashFlow.repayments[yearIndex], sum(cashFlow.repayments[yearIndex])]);
                if (isSoleProprietor) {
                    rows.push([t('print.liquiditaet.private_withdrawal'), ...cashFlow.privateWithdrawals[yearIndex], sum(cashFlow.privateWithdrawals[yearIndex])]);
                }
                
                rows.push([t('print.liquiditaet.liquidity_balance'), ...saldoLfdLiquiditaet, sum(saldoLfdLiquiditaet)]);
                rows.push([t('print.liquiditaet.accumulated_liquidity'), ...cashFlow.accumulatedLiquidity[yearIndex], cashFlow.accumulatedLiquidity[yearIndex][11]]);

                return (
                    <div key={yearIndex} className="print-year-section">
                        <h3>{t('print.years.title', { title: t('print.liquiditaet.title'), yearNumber: yearIndex + 1, yearValue: foundationYear + yearIndex })}</h3>
                        <PrintTable headers={headers} rows={rows} />
                    </div>
                );
            })}
        </PrintPageWrapper>
    );
};

const PrintJahresuebersichten = ({ calculations, settings }: { calculations: CalculationResults, settings: CompanySettings }) => {
    const { t } = useTranslation();
    const { yearly, monthly, cashFlow } = calculations;

    return (
        <PrintPageWrapper title={t('print.annual_overviews.title')}>
            {[...Array(settings.planningYears).keys()].map(year => {
                const yearData = yearly[year];
                const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);
                
                const summaryKpis = [
                    { label: t('print.guv.revenue'), value: yearData.revenue },
                    { label: t('print.guv.ebt'), value: yearData.profitBeforeTax },
                    { label: t('print.guv.net_cash_flow'), value: yearData.netCashFlow },
                ];

                const monthlyGrossProfit = monthly[year].map(m => m.totalRevenue - m.variableCosts);
                const monthlyOpCosts = monthly[year].map(m => m.operationalCosts);
                const monthlyDepreciation = monthly[year].map(m => m.depreciation);
                const monthlyInterest = monthly[year].map(m => m.interest);
                const monthlyWithdrawals = cashFlow.privateWithdrawals[year];
                
                const monthLabels = t('common.months', { returnObjects: true }) as string[];
                
                const chartDatasets = [
                    { label: t('print.guv.gross_profit'), values: monthlyGrossProfit },
                    { label: t('print.guv.operating_expenses'), values: monthlyOpCosts },
                    { label: t('print.guv.depreciation'), values: monthlyDepreciation },
                    { label: t('print.guv.interest'), values: monthlyInterest },
                    { label: t('print.guv.private_withdrawal'), values: monthlyWithdrawals }
                ];
                
                const tableRows = [
                    [t('print.guv.gross_profit'), yearData.grossProfit],
                    [t('print.guv.operating_expenses'), yearData.operationalCosts],
                    [t('print.guv.depreciation'), yearData.depreciation],
                    [t('print.guv.interest'), yearData.interest],
                    [t('print.guv.private_withdrawal'), yearData.privateWithdrawals],
                    [t('uebersicht.ros'), {value: formatPercentage(yearData.returnOnSales), align: 'right' as const}],
                    [t('uebersicht.roi'), {value: formatPercentage(yearData.roi), align: 'right' as const}],
                    [t('uebersicht.break_even'), yearData.breakEvenRevenue > 0 ? yearData.breakEvenRevenue : t('common.not_available')],
                ];
                
                return (
                    <div key={year} className="print-year-section print-jahresuebersicht-item">
                        <h3>{t('print.annual_overviews.year_title', { yearNumber: year + 1, yearValue: foundationYear + year })}</h3>
                        
                        <div className="print-summary-kpi-boxes">
                            {summaryKpis.map(kpi => (
                                <div key={kpi.label} className="print-summary-kpi-box">
                                    <h4>{kpi.label}</h4>
                                    <p>{formatCurrency(kpi.value)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="print-jahresuebersicht-grid">
                            <div className="print-chart-wrapper">
                                <LineChart
                                    title={t('uebersicht.monthly_kpi_trend')}
                                    labels={monthLabels}
                                    datasets={chartDatasets}
                                    isStale={false}
                                />
                            </div>
                            <div className="print-table-wrapper">
                                <h4>{t('uebersicht.kpi_overview')}</h4>
                                <PrintTable headers={[t('print.table.category'), t('print.table.value')]} rows={tableRows} tableClassName="summary-kpi-table" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </PrintPageWrapper>
    );
};export const PrintContainer = ({ projectData, calculations, plansToPrint }: { projectData: FinancialData, calculations: CalculationResults, plansToPrint: Record<string, boolean> }) => {
    const { t } = useTranslation();
    const shouldRenderFirstPage = plansToPrint.basicSettings;

    return (
        <div id="printable-area">
            <PrintHeader projectName={projectData.settings.title} />
            
            {shouldRenderFirstPage && calculations && (
                <PrintFirstPage data={projectData} calculations={calculations} />
            )}

            {plansToPrint.privateDemand && <PrintPrivatbedarfsplan data={projectData.privateNeeds} settings={projectData.settings} />}
            {plansToPrint.financingPlan && <PrintFinanzierungsplan data={projectData.financing} />}
            {plansToPrint.productPricing && <PrintProduktPreiskalkulation data={projectData.products} />}
            {plansToPrint.salesPlan && <PrintAbsatzplan products={projectData.products} sales={projectData.sales} settings={projectData.settings} />}
            {plansToPrint.earningsPlan && calculations && <PrintGuV data={projectData} calculations={calculations} />}
            {plansToPrint.liquidityPlan && calculations && <PrintLiquiditaetsplan calculations={calculations} settings={projectData.settings} />}
            {plansToPrint.depreciationPlan && <PrintAbschreibungsplan data={projectData.assets} />}
            
            {/* --- STATISTICS --- */}
            {plansToPrint.statsYearly && calculations && (
                <PrintJahresuebersichten calculations={calculations} settings={projectData.settings} />
            )}
            {plansToPrint.statsBanks && calculations && (
                 <PrintPageWrapper title={t('stats.banken.title')} className="print-stat-page"><BankenStatistik data={projectData} calculations={calculations} isStale={false} /></PrintPageWrapper>
            )}
             {plansToPrint.statsInvestors && calculations && (
                 <PrintPageWrapper title={t('stats.investoren.title')} className="print-stat-page"><InvestorenStatistik data={projectData} calculations={calculations} isStale={false} /></PrintPageWrapper>
            )}
            {plansToPrint.statsGrantors && calculations && (
                 <PrintPageWrapper title={t('stats.foerdergeber.title')} className="print-stat-page"><FoerdergeberStatistik data={projectData} calculations={calculations} isStale={false} /></PrintPageWrapper>
            )}
            {plansToPrint.scenarioComparison && calculations && (
                 <PrintPageWrapper title={t('scenarios.title')} className="print-stat-page"><Szenariovergleich baseData={projectData} baseCalculations={calculations} isStale={false} /></PrintPageWrapper>
            )}
        </div>
    );
};