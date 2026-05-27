/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart } from '../../components/LineChart.tsx';
import { BarChart } from '../../components/BarChart.tsx';
import { CollapsibleSection } from '../../components/CollapsibleSection.tsx';
import { formatCurrency } from '../../utils.ts';
import { MONTHS } from '../../constants.ts';
import type { FinancialData, CalculationResults } from '../../types.ts';

interface BankenStatistikProps {
    data: FinancialData;
    calculations: CalculationResults;
    isStale: boolean;
}

export const BankenStatistik = memo(({ data, calculations, isStale }: BankenStatistikProps) => {
    const { t } = useTranslation();
    const { yearly, cashFlow } = calculations;
    const foundationYear = parseInt(data.settings.foundationDate.substring(0, 4), 10);
    const planningYears = data.settings.planningYears || 3;
    const yearLabels = yearly.map((_, i: number) => t('stats.fiscal_year_short', { index: i + 1 }));

    const liquiditaetValues = (cashFlow?.accumulatedLiquidity || []).flat();
    const liquiditaetLabels = Array.from({ length: planningYears * 12 }, (_, i) => {
        const year = foundationYear + Math.floor(i / 12);
        const monthIndex = i % 12;
        const month = t(`common.months.${monthIndex}`, { defaultValue: (MONTHS as string[])[monthIndex] });
        return `${month} ${String(year).slice(2)}`;
    });
    const cfoData = yearly.map((y) => (y.profitBeforeTax || 0) + (y.depreciation || 0));
    const kapitaldienstData = yearly.map((y, i: number) => (y.interest || 0) + (cashFlow?.repayments?.[i]?.reduce((a: number, b: number) => a + b, 0) || 0));
    const kapitaldienstKPIs = yearly.map((y, i: number) => {
        const kapitaldienstgrenze = (y.profitBeforeTax || 0) + (y.depreciation || 0) + (y.interest || 0);
        const tilgung = cashFlow?.repayments?.[i]?.reduce((a: number, b: number) => a + b, 0) || 0;
        const kapitaldienst = (y.interest || 0) + tilgung;
        const deckungsgrad = kapitaldienst > 0 ? kapitaldienstgrenze / kapitaldienst : 0;
        return { kapitaldienstgrenze, kapitaldienst, deckungsgrad };
    });

    return (
        <CollapsibleSection title={t('stats.banken.title')}>
            <div className="statistik-container">
                <div className="bank-statistik-grid">
                    <div className="chart-wrapper">
                        <LineChart
                            title={t('stats.banken.liquiditaet_chart_title')}
                            labels={liquiditaetLabels}
                            datasets={[{ label: t('stats.banken.liquiditaet_label'), values: liquiditaetValues }]}
                            isStale={isStale}
                        />
                    </div>
                    <div className="chart-wrapper">
                        <BarChart
                            title={t('stats.banken.cashflow_vs_kapitaldienst_title')}
                            labels={yearLabels}
                            datasets={[
                                { label: t('stats.banken.available_cashflow_label'), values: cfoData, type: 'bar1' },
                                { label: t('stats.banken.debt_service_label'), values: kapitaldienstData, type: 'bar2' },
                            ]}
                            isStale={isStale}
                        />
                    </div>
                    <div>
                        <h4>{t('stats.banken.break_even_title')}</h4>
                        <div className="bank-kpi-grid">
                            {yearly.map((y, i: number) => (
                                <div className="summary-card" key={i}>
                                    <h3>{t('stats.fiscal_year_short', { index: i + 1 })}</h3>
                                    <p>{y.breakEvenRevenue > 0 ? formatCurrency(y.breakEvenRevenue) : 'N/A'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4>{t('stats.banken.debt_service_analysis_title')}</h4>
                        <div className="bank-kpi-grid">
                            {kapitaldienstKPIs.map((kpi, i: number) => (
                                <div className="summary-card" key={i}>
                                    <h3>{t('stats.fiscal_year_short', { index: i + 1 })}</h3>
                                    <ul className="kpi-detail-list">
                                        <li>
                                            <span>{t('stats.banken.kpi.debt_service_limit')}</span>
                                            <span>{formatCurrency(kpi.kapitaldienstgrenze)}</span>
                                        </li>
                                        <li>
                                            <span>{t('stats.banken.kpi.debt_service')}</span>
                                            <span>{formatCurrency(kpi.kapitaldienst)}</span>
                                        </li>
                                        <li>
                                            <span>{t('stats.banken.kpi.coverage_ratio')}</span>
                                            <span className={kpi.deckungsgrad >= 1 ? 'positive' : 'negative'}>
                                                {kpi.deckungsgrad.toFixed(2)} {kpi.deckungsgrad >= 1 ? '✓' : '✗'}
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
});