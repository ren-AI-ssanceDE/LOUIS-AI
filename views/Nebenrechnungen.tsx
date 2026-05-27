/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils.ts';
import { MONTHS } from '../constants.ts';
import type { CompanySettings, CalculationResults } from '../types.ts';

interface NebenrechnungenProps {
    calculations: CalculationResults;
    settings: CompanySettings;
}

export const Nebenrechnungen = memo(({ calculations, settings }: NebenrechnungenProps) => {
    const { t } = useTranslation();
    const { cashFlow } = calculations;
    const planningYears = settings.planningYears || 3;
    const [activeYear, setActiveYear] = useState(0);
    const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);
    
    const renderMonthlyCashflowTable = (yearIndex: number) => {
        const visibleMonths = Array.from({ length: 12 }, (_, i) => i);
        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

        const renderRow = (label: string, values: number[], isBold: boolean = false) => (
             <tr className={isBold ? 'total-row' : ''}>
                <td className="sticky-col"><div className="row-header">{label}</div></td>
                {visibleMonths.map(m => <td key={m} className="calculated-cell">{formatCurrency(values[m])}</td>)}
                <td className="total-col">{formatCurrency(sum(values))}</td>
            </tr>
        );
        
        const netCashFlowMonthly = Array(12).fill(0).map((_,m) => {
            const kumulierte = cashFlow.accumulatedLiquidity[yearIndex][m];
            const prevKumulierte = m > 0 ? cashFlow.accumulatedLiquidity[yearIndex][m-1] : (yearIndex > 0 ? cashFlow.accumulatedLiquidity[yearIndex-1][11] : 0);
            return kumulierte - prevKumulierte;
        });
        
        const repayment = cashFlow.repayments[yearIndex];
        const interest = cashFlow.interestPayments[yearIndex];
        const capitalService = Array(12).fill(0).map((_, m) => repayment[m] + interest[m]);
        const privateWithdrawals = cashFlow.privateWithdrawals[yearIndex];
        
        return (
            <div className="table-container">
                <table>
                    <thead className="sticky-header">
                        <tr>
                            <th className="sticky-col"><div className="row-header">{t('nebenrechnungen.additional_info')}</div></th>
                            {visibleMonths.map(m => <th key={m}>{t(`common.months.${m}`, { defaultValue: MONTHS[m] })}</th>)}
                            <th>{t('nebenrechnungen.total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderRow(t('nebenrechnungen.cash_flow_pre_tax'), netCashFlowMonthly, true)}
                        {renderRow(t('nebenrechnungen.repayment'), repayment)}
                        {renderRow(t('nebenrechnungen.capital_service'), capitalService, true)}
                        {renderRow(t('nebenrechnungen.private_withdrawal'), privateWithdrawals)}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="card">
            <h2>{t('nebenrechnungen.title')}</h2>
            <div className="tabs-container">
                {[...Array(planningYears).keys()].map(year => (
                    <div key={year} className={`tab ${activeYear === year ? 'active' : ''}`} onClick={() => setActiveYear(year)}>
                        <span className="tab-label">{t('nebenrechnungen.fiscal_year', { index: year + 1, year: foundationYear + year })}</span>
                    </div>
                ))}
            </div>
            <div className="tab-content">
                {renderMonthlyCashflowTable(activeYear)}
            </div>
        </div>
    );
});