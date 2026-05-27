/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { formatCurrency } from '../../utils.ts';
import { MONTHS } from '../../constants.ts';
import { useTranslation } from 'react-i18next';
import type { FinancialData, CalculationResults } from '../../types.ts';

interface LiquiditaetsplanTableProps {
    yearIndex: number;
    foundationMonth: number;
    foundationYear: number;
    cashFlow: CalculationResults['cashFlow'];
    data: FinancialData;
}

export const LiquiditaetsplanTable = memo(({ 
    yearIndex, 
    foundationMonth, 
    foundationYear,
    cashFlow, 
    data 
}: LiquiditaetsplanTableProps) => {
    const { t } = useTranslation();
    const visibleMonths = Array.from({ length: 12 }, (_, i) => i).filter(m => !(yearIndex === 0 && m < foundationMonth));
    const isShortYear = yearIndex === 0 && visibleMonths.length < 12;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const renderRow = (label: string, values: number[], isBold: boolean = false, isSub: boolean = false) => (
         <tr key={label} className={isBold ? 'total-row' : (isSub ? 'sub-row' : '')}>
            <td className="sticky-col"><div className={`row-header ${isSub ? 'sub-label' : ''}`}>{label}</div></td>
            {visibleMonths.map(m => <td key={m} className="input-cell disabled"><span>{formatCurrency(values[m])}</span></td>)}
            <td className="total-col"><span>{formatCurrency(sum(values))}</span></td>
        </tr>
    );
    
    const revenueNetYear = cashFlow.revenueNet[yearIndex] || Array(12).fill(0);
    const vatCollectedYear = cashFlow.vatCollected[yearIndex] || Array(12).fill(0);
    const sumLaufendeEinzahlungen = Array(12).fill(0).map((_, m) => (revenueNetYear[m] || 0) + (vatCollectedYear[m] || 0));
    
    let opCostsSum = Array(12).fill(0);
    Object.values(cashFlow.opCosts).forEach((costs: number[][]) => {
        if (!costs || !costs[yearIndex]) return;
        costs[yearIndex].forEach((val: number, m: number) => {
            if (m < 12) opCostsSum[m] += (val || 0);
        });
    });

    const variableCostsYear = cashFlow.variableCosts[yearIndex] || Array(12).fill(0);
    const interestPaymentsYear = cashFlow.interestPayments[yearIndex] || Array(12).fill(0);
    const vatPaidYear = cashFlow.vatPaid?.[yearIndex] || Array(12).fill(0);
    const vatPaymentsYear = cashFlow.vatPayments[yearIndex] || Array(12).fill(0);

    const sumLaufendeAuszahlungen = Array(12).fill(0).map((_, m) => 
        (variableCostsYear[m] || 0) +
        (opCostsSum[m] || 0) +
        (interestPaymentsYear[m] || 0) +
        (vatPaidYear[m] || 0) +
        (vatPaymentsYear[m] || 0)
    );
    
    const isSoleProprietor = data.settings.legalForm === 'Gewerbe (Einzelunternehmen)' || data.settings.legalForm === 'Freiberufliche Selbstständigkeit';

    const opCostItems: {label: string, values: number[]}[] = ([
        { label: t('operational_costs.ceo_salaries'), values: (cashFlow.opCosts.managementSalary?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.personnel'), values: (cashFlow.opCosts.personnelCosts?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.facility_costs'), values: (cashFlow.opCosts.rentAndFacilities?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.office_costs'), values: (cashFlow.opCosts.officeSupplies?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.vehicle_costs'), values: (cashFlow.opCosts.vehicleExpenses?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.advertising_costs'), values: (cashFlow.opCosts.advertisingCosts?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.insurance'), values: (cashFlow.opCosts.insuranceAndFees?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.consulting_costs'), values: (cashFlow.opCosts.consultingCosts?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.travel_costs'), values: (cashFlow.opCosts.travelExpenses?.[yearIndex]) || Array(12).fill(0) },
        { label: t('operational_costs.other_expenses'), values: (cashFlow.opCosts.otherOperatingExpenses?.[yearIndex]) || Array(12).fill(0) },
    ] as {label: string, values: number[]}[]).filter(item => {
        if (isSoleProprietor && item.label === t('operational_costs.ceo_salaries')) return false;
        return true;
    });
    
    const saldoLfdLiquiditaet = Array(12).fill(0).map((_, m) => {
        const kumulierteYear = cashFlow.accumulatedLiquidity[yearIndex] || Array(12).fill(0);
        const kumulierte = kumulierteYear[m] || 0;
        const prevYear = yearIndex > 0 ? cashFlow.accumulatedLiquidity[yearIndex - 1] : null;
        const prevKumulierte = m > 0 ? kumulierteYear[m - 1] : (prevYear ? prevYear[11] : 0);
        return kumulierte - (prevKumulierte || 0);
    });
    
    return (
        <div className={`table-container ${isShortYear ? 'table-container-fit-content' : ''}`}>
            <table>
                <thead className="sticky-header">
                    <tr>
                        <th className="sticky-col"><div className="row-header">{t('liquiditaet.position')}</div></th>
                        {visibleMonths.map(m => <th key={m}>{MONTHS[m]}</th>)}
                        <th className="total-col">{t('common.total')} {foundationYear + yearIndex}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="sub-row-header">
                        <td className="sticky-col"><div className="row-header">{t('liquiditaet.running_incomes')}</div></td>
                        <td colSpan={visibleMonths.length + 1}></td>
                    </tr>
                    {renderRow(t('liquiditaet.revenue_net'), cashFlow.revenueNet[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.vat_sales'), cashFlow.vatCollected[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.sum_running_incomes'), sumLaufendeEinzahlungen, true, false)}

                    <tr className="sub-row-header">
                        <td className="sticky-col"><div className="row-header">{t('liquiditaet.running_expenses')}</div></td>
                        <td colSpan={visibleMonths.length + 1}></td>
                    </tr>
                    {renderRow(t('liquiditaet.cogs_net'), cashFlow.variableCosts[yearIndex] || Array(12).fill(0), false, true)}
                    {opCostItems.map(item => renderRow(`- ${item.label} (${t('liquiditaet.net')})`, item.values, false, true))}
                    {renderRow(t('liquiditaet.interest_payments'), cashFlow.interestPayments[yearIndex] || Array(12).fill(0), false, true)}
                    {data.settings.isVatDeductible && cashFlow.vatPaid && renderRow(t('liquiditaet.vat_purchases'), cashFlow.vatPaid[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.vat_payment_to_tax_office'), cashFlow.vatPayments[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.sum_running_expenses'), sumLaufendeAuszahlungen, true, false)}

                    <tr className="sub-row-header">
                        <td className="sticky-col"><div className="row-header">{t('liquiditaet.invest_finance_activity')}</div></td>
                        <td colSpan={visibleMonths.length + 1}></td>
                    </tr>
                    {renderRow(t('liquiditaet.equity_inflow'), cashFlow.equityInflow[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.loan_inflow'), cashFlow.debtInflow[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.invest_outflow'), cashFlow.investmentOutflows[yearIndex] || Array(12).fill(0), false, true)}
                    {renderRow(t('liquiditaet.repayment_outflow'), cashFlow.repayments[yearIndex] || Array(12).fill(0), false, true)}
                    {isSoleProprietor && renderRow(t('liquiditaet.private_withdrawal'), cashFlow.privateWithdrawals[yearIndex] || Array(12).fill(0), false, true)}
                    
                    <tr className="total-row">
                         <td className="sticky-col"><div className="row-header">{t('liquiditaet.saldo_running')}</div></td>
                         {visibleMonths.map(m => <td key={m} className="input-cell disabled"><span>{formatCurrency(saldoLfdLiquiditaet[m])}</span></td>)}
                         <td className="total-col"><span>{formatCurrency(sum(saldoLfdLiquiditaet))}</span></td>
                    </tr>
                    <tr className="total-row">
                        <td className="sticky-col"><div className="row-header">{t('liquiditaet.kumulierte_liquiditaet')}</div></td>
                        {visibleMonths.map(m => <td key={m} className="input-cell disabled"><span>{formatCurrency((cashFlow.accumulatedLiquidity[yearIndex] || Array(12).fill(0))[m] || 0)}</span></td>)}
                        <td className="total-col"><span>{formatCurrency((cashFlow.accumulatedLiquidity[yearIndex] || Array(12).fill(0))[11] || 0)}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
});
