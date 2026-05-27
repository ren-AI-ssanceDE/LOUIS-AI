/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart } from '../../components/BarChart.tsx';
import { CollapsibleSection } from '../../components/CollapsibleSection.tsx';
import { formatCurrency } from '../../utils.ts';
import type { FinancialData, CalculationResults } from '../../types.ts';

interface FoerdergeberStatistikProps {
    data: FinancialData;
    calculations: CalculationResults;
    isStale: boolean;
}

export const FoerdergeberStatistik = memo(({ data, calculations, isStale }: FoerdergeberStatistikProps) => {
    const { t } = useTranslation();
    const { yearly, cashFlow } = calculations;
    const yearLabels = yearly.map((_, i: number) => t('stats.fiscal_year_short', { index: i + 1 }));

    const totalStartupCosts = Object.values(data.startupCosts).reduce((sum: number, val) => sum + (typeof val === 'number' ? val : 0), 0);
    const totalInvestments = data.assets.reduce((sum, asset) => sum + asset.purchasePrice, 0);
    const totalEquity = data.financing.filter(f => f.type === 'equity').reduce((sum, f) => sum + f.amount, 0);
    const totalDebt = data.financing.filter(f => f.type === 'debt').reduce((sum, f) => sum + f.amount, 0);
    const costData: Record<string, number[]> = {
        [t('stats.foerdergeber.cost_blocks.personnel')]: yearly.map((_, i: number) => 
            (cashFlow.opCosts.personnelCosts?.[i]?.reduce((a:number,b:number)=>a+b, 0) || 0) + 
            (cashFlow.opCosts.managementSalary?.[i]?.reduce((a:number,b:number)=>a+b, 0) || 0)
        ),
        [t('stats.foerdergeber.cost_blocks.facility')]: yearly.map((_, i: number) => cashFlow.opCosts.rentAndFacilities?.[i]?.reduce((a:number,b:number)=>a+b, 0) || 0),
        [t('stats.foerdergeber.cost_blocks.marketing')]: yearly.map((_, i: number) => cashFlow.opCosts.advertisingCosts?.[i]?.reduce((a:number,b:number)=>a+b, 0) || 0),
    };
    
    const tableRows = [
        { label: t('ertragsplan.revenue'), values: yearly.map((y) => y.revenue) },
        { label: t('uebersicht.profit_bt_short'), values: yearly.map((y) => y.profitBeforeTax) },
        { label: t('uebersicht.net_cash_flow'), values: yearly.map((y) => y.netCashFlow) },
        { label: t('stats.foerdergeber.kpis.liquidity_end'), values: yearly.map((y) => y.endBalance) },
    ];

    const chunkSize = 5;
    const tableChunks: { yearLabels: string[], rows: { label: string, values: number[] }[] }[] = [];

    for (let i = 0; i < yearLabels.length; i += chunkSize) {
        const chunkYearLabels = yearLabels.slice(i, i + chunkSize);
        const chunkRows = tableRows.map(row => ({
            label: row.label,
            values: row.values.slice(i, i + chunkSize)
        }));
        tableChunks.push({ yearLabels: chunkYearLabels, rows: chunkRows });
    }

    return (
        <CollapsibleSection title={t('stats.foerdergeber.title')}>
            <div className="statistik-container foerdergeber-container">
                <div className="foerdergeber-kapital-section">
                    <h4>{t('stats.investoren.funding_structure_title')}</h4>
                    <div className="responsive-grid">
                        <div className="summary-card"><h3>{t('finanzierungsplan.startup_costs')}</h3><p>{formatCurrency(totalStartupCosts + totalInvestments)}</p></div>
                        <div className="summary-card"><h3>{t('finanzierungsplan.equity')}</h3><p>{formatCurrency(totalEquity)}</p></div>
                        <div className="summary-card"><h3>{t('finanzierungsplan.debt')}</h3><p>{formatCurrency(totalDebt)}</p></div>
                        <div className="summary-card"><h3>{t('common.total')}</h3><p>{formatCurrency(totalEquity + totalDebt)}</p></div>
                    </div>
                </div>
                <div className="chart-wrapper foerdergeber-chart-section">
                    <BarChart
                        title={t('stats.foerdergeber.cost_overview_title')}
                        labels={yearLabels}
                        datasets={[
                            { label: t('stats.foerdergeber.cost_blocks.personnel'), values: costData[t('stats.foerdergeber.cost_blocks.personnel')], type: 'bar1' },
                            { label: t('stats.foerdergeber.cost_blocks.facility'), values: costData[t('stats.foerdergeber.cost_blocks.facility')], type: 'bar2' },
                            { label: t('stats.foerdergeber.cost_blocks.marketing'), values: costData[t('stats.foerdergeber.cost_blocks.marketing')], type: 'bar3' },
                        ]}
                        isStale={isStale}
                    />
                </div>
                <div className="foerdergeber-table-section">
                    <h4>{t('stats.foerdergeber.long_term_finance_title')}</h4>
                    {tableChunks.map((chunk, chunkIndex) => (
                        <div key={chunkIndex} className="table-container" style={{ marginTop: chunkIndex > 0 ? '1.5rem' : '0' }}>
                            <table className="gewinn-table">
                                <thead>
                                    <tr>
                                        <th>{t('uebersicht.kpi')}</th>
                                        {chunk.yearLabels.map(label => <th key={label} className="calculated-cell">{label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {chunk.rows.map(row => (
                                         <tr key={row.label}>
                                            <td>{row.label}</td>
                                            {row.values.map((value, i) => (
                                                <td key={i} className="calculated-cell">{formatCurrency(value)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </CollapsibleSection>
    );
});
