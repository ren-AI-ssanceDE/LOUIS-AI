/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart } from '../../components/BarChart.tsx';
import { CollapsibleSection } from '../../components/CollapsibleSection.tsx';
import { formatCurrency, formatMonths, formatPercentage } from '../../utils.ts';
import type { FinancialData, CalculationResults } from '../../types.ts';

interface InvestorenStatistikProps {
    data: FinancialData;
    calculations: CalculationResults;
    isStale: boolean;
}

export const InvestorenStatistik = memo(({ calculations, isStale }: InvestorenStatistikProps) => {
    const { t } = useTranslation();
    const { yearly, totalOverview } = calculations;
    const yearLabels = yearly.map((_, i: number) => t('stats.fiscal_year_short', { index: i + 1 }));

    const umsatzData = yearly.map((y) => y.revenue);
    const gewinnData = yearly.map((y) => y.profitBeforeTax);

    return (
        <CollapsibleSection title={t('stats.investoren.title')}>
            <div className="statistik-container">
                <div className="investor-top-grid">
                    <div className="chart-wrapper">
                        <BarChart
                            title={`${t('ertragsplan.revenue')} vs. ${t('uebersicht.profit_bt_short')}`}
                            labels={yearLabels}
                            datasets={[
                                { label: t('ertragsplan.revenue'), values: umsatzData, type: 'bar1' },
                                { label: t('uebersicht.profit_bt_short'), values: gewinnData, type: 'bar2' },
                            ]}
                            isStale={isStale}
                        />
                    </div>
                    <div className="kpi-section">
                        <h4>{t('stats.investoren.profitability_title')}</h4>
                        <div className="kpi-container">
                            <div className="kpi-card"><h3>{t('stats.investoren.kpi.payback_period')}</h3><p>{formatMonths(totalOverview.paybackMonths)}</p></div>
                            <div className="kpi-card"><h3>{t('stats.investoren.kpi.avg_ros')}</h3><p>{formatPercentage(totalOverview.averageROS)}</p></div>
                            <div className="kpi-card"><h3>{t('stats.investoren.kpi.final_roi')}</h3><p>{formatPercentage(totalOverview.finalROI)}</p></div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 style={{marginTop: '2rem'}}>{t('uebersicht.profit_calculation_title')}</h4>
                    <div className="responsive-grid print-flex-container-5-cols">
                        {yearly.map((y, i: number) => (
                            <div key={i} className="table-container">
                                <table className="gewinn-table">
                                    <thead>
                                        <tr>
                                            <th colSpan={2}>{t('stats.fiscal_year_short', { index: i + 1 })}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>{t('ertragsplan.revenue')}</td><td className="calculated-cell">{formatCurrency(y.revenue)}</td></tr>
                                        <tr><td>- {t('ertragsplan.cogs')}</td><td className="calculated-cell">{formatCurrency(-y.variableCosts)}</td></tr>
                                        <tr className="total-row"><td>= {t('ertragsplan.gross_profit')}</td><td className="calculated-cell">{formatCurrency(y.grossProfit)}</td></tr>
                                        <tr><td>- {t('uebersicht.operational_costs')}</td><td className="calculated-cell">{formatCurrency(-y.operationalCosts)}</td></tr>
                                        <tr><td>- {t('abschreibungsplan.afa_title')}</td><td className="calculated-cell">{formatCurrency(-y.depreciation)}</td></tr>
                                        <tr className="total-row"><td>= {t('ertragsplan.ebit_short')}</td><td className="calculated-cell">{formatCurrency(y.grossProfit - y.operationalCosts - y.depreciation)}</td></tr>
                                        <tr><td>- {t('finanzierungsplan.interest')}</td><td className="calculated-cell">{formatCurrency(-y.interest)}</td></tr>
                                        <tr className="total-row"><td>= {t('ertragsplan.ebt_short')}</td><td className="calculated-cell">{formatCurrency(y.profitBeforeTax)}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
});
