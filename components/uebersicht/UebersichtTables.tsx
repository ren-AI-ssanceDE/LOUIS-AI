/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { formatCurrency } from '../../utils.ts';
import { MONTHS } from '../../constants.ts';
import type { CalculationResults, OpCostCategoryKey } from '../../types.ts';
import { useTranslation } from 'react-i18next';

export const NebenrechnungenTable = memo(({ 
    yearIndex, 
    foundationMonth, 
    cashFlow
}: { 
    yearIndex: number, 
    foundationMonth: number, 
    cashFlow: CalculationResults['cashFlow']
}) => {
    const { t } = useTranslation();
    const visibleMonths = Array.from({ length: 12 }, (_, i) => i).filter(m => !(yearIndex === 0 && m < foundationMonth));
    const isShortYear = yearIndex === 0 && visibleMonths.length < 12;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const renderRow = (label: string, values: number[], isBold: boolean = false) => (
         <tr className={isBold ? 'total-row' : ''}>
            <td className="sticky-col"><div className="row-header">{label}</div></td>
            {visibleMonths.map(m => <td key={m} className="calculated-cell">{formatCurrency(values[m])}</td>)}
            <td className="total-col">{formatCurrency(sum(values))}</td>
        </tr>
    );
    
    const netCashFlowMonthly = Array(12).fill(0).map((_, m) => {
        const kumulierteYear = cashFlow.accumulatedLiquidity[yearIndex] || [];
        const kumulierte = kumulierteYear[m] || 0;
        const prevYear = yearIndex > 0 ? cashFlow.accumulatedLiquidity[yearIndex - 1] : null;
        const prevKumulierte = m > 0 ? kumulierteYear[m - 1] : (prevYear ? prevYear[11] : 0);
        return kumulierte - (prevKumulierte || 0);
    });
    
    const repayment = cashFlow.repayments[yearIndex] || Array(12).fill(0);
    const interest = cashFlow.interestPayments[yearIndex] || Array(12).fill(0);
    const capitalService = Array(12).fill(0).map((_, m) => (repayment[m] || 0) + (interest[m] || 0));
    const privateWithdrawals = cashFlow.privateWithdrawals[yearIndex] || Array(12).fill(0);
    
    return (
        <div className={`table-container ${isShortYear ? 'table-container-fit-content' : ''}`}>
            <table>
                <thead className="sticky-header">
                    <tr>
                        <th className="sticky-col"><div className="row-header">{t('ertragsplan.position')}</div></th>
                        {visibleMonths.map(m => (
                            <th key={m}>{t(`months.${m}`, { defaultValue: MONTHS[m] })}</th>
                        ))}
                        <th>{t('common.total')}</th>
                    </tr>
                </thead>
                <tbody>
                    {renderRow(t('uebersicht.cash_flow_before_taxes'), netCashFlowMonthly, true)}
                    {renderRow(t('uebersicht.debt_repayment'), repayment)}
                    {renderRow(t('uebersicht.capital_service'), capitalService, true)}
                    {renderRow(t('uebersicht.private_withdrawals'), privateWithdrawals)}
                </tbody>
            </table>
        </div>
    );
});

export const YearlyOverviewTable = memo(({ 
    yearly, 
    cashFlow, 
    planningYears, 
    foundationYear 
}: { 
    yearly: CalculationResults['yearly'], 
    cashFlow: CalculationResults['cashFlow'], 
    planningYears: number, 
    foundationYear: number 
}) => {
    const { t } = useTranslation();
    const yearHeaders = [t('ertragsplan.position'), ...[...Array(planningYears).keys()].map(y => `${t('absatzplan.fiscal_year')} ${y + 1} (${foundationYear + y})`)];
    const yearlySum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const costCategories: { key: OpCostCategoryKey, label: string }[] = [
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
    ];

    const opCostsYearly = costCategories.map(cat => 
        [...Array(planningYears).keys()].map(y => 
            yearlySum((cashFlow.opCosts[cat.key] && cashFlow.opCosts[cat.key][y]) || [])
        )
    );

    const aufwendungenRowsData = [
        ...opCostsYearly,
        yearly.map(y => y.interest)
    ];

    const summeAufwendungenYearly = [...Array(planningYears).keys()].map(y => 
        aufwendungenRowsData.reduce((sum, row) => sum + (row[y] || 0), 0)
    );

    const gewinnVerlustYearly = [...Array(planningYears).keys()].map(y => {
        const yearData = yearly[y];
        return (yearData?.grossProfit || 0) - (summeAufwendungenYearly[y] || 0) - (yearData?.depreciation || 0);
    });
    
    return (
        <div className="table-container table-container-fit-content">
            <table>
                <thead className="sticky-header">
                    <tr>
                        {yearHeaders.map((h, i) => <th key={i} className={`${i === 0 ? 'sticky-col' : 'calculated-cell'}`}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="sticky-col">{t('uebersicht.revenue')}</td>
                        {yearly.map((y, i) => <td key={i} className="calculated-cell">{formatCurrency(y.revenue)}</td>)}
                    </tr>
                     <tr>
                        <td className="sticky-col">- {t('uebersicht.cogs')}</td>
                        {yearly.map((y, i) => <td key={i} className="calculated-cell">{formatCurrency(y.variableCosts)}</td>)}
                    </tr>
                    <tr className="total-row">
                        <td className="sticky-col">{t('uebersicht.gross_profit')}</td>
                        {yearly.map((y, i) => <td key={i} className="calculated-cell">{formatCurrency(y.grossProfit)}</td>)}
                    </tr>
                    {costCategories.map((cat, i) => (
                        <tr key={cat.key}>
                            <td className="sticky-col">- {cat.label}</td>
                            {opCostsYearly[i].map((val, y) => <td key={y} className="calculated-cell">{formatCurrency(val)}</td>)}
                        </tr>
                    ))}
                     <tr>
                        <td className="sticky-col">- {t('uebersicht.interest')}</td>
                        {yearly.map((y, i) => <td key={i} className="calculated-cell">{formatCurrency(y.interest)}</td>)}
                    </tr>
                    <tr className="total-row">
                        <td className="sticky-col">{t('uebersicht.sum_expenses')}</td>
                        {summeAufwendungenYearly.map((val, y) => <td key={y} className="calculated-cell">{formatCurrency(val)}</td>)}
                    </tr>
                    <tr>
                        <td className="sticky-col">- {t('uebersicht.depreciation')}</td>
                        {yearly.map((y, i) => <td key={i} className="calculated-cell">{formatCurrency(y.depreciation)}</td>)}
                    </tr>
                    <tr className="total-row">
                        <td className="sticky-col">{t('uebersicht.profit_loss')}</td>
                        {gewinnVerlustYearly.map((val, y) => <td key={y} className="calculated-cell">{formatCurrency(val)}</td>)}
                    </tr>
                </tbody>
            </table>
        </div>
    );
});
