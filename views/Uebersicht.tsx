/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useEffect, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage, formatMonths } from '../utils.ts';
import { type FinancialData, type CalculationResults } from '../types.ts';
import { CollapsibleSection } from '../components/CollapsibleSection.tsx';
import { BankenStatistik } from './statistik/BankenStatistik.tsx';
import { InvestorenStatistik } from './statistik/InvestorenStatistik.tsx';
import { FoerdergeberStatistik } from './statistik/FoerdergeberStatistik.tsx';
import { Szenariovergleich } from './statistik/Szenariovergleich.tsx';
import { LineChart } from '../components/LineChart.tsx';
import { MONTHS } from '../constants.ts';
import { NebenrechnungenTable, YearlyOverviewTable } from '../components/uebersicht/UebersichtTables.tsx';

export const Uebersicht = memo(({ data, calculations }: { data: FinancialData, calculations: CalculationResults }) => {
    const { t } = useTranslation();
    const [chartData, setChartData] = useState({ calculations, isStale: false });
    const timerRef = useRef<number | null>(null);
    const [activeNebenrechnungenYear, setActiveNebenrechnungenYear] = useState(0);

    useEffect(() => {
        setChartData(prev => ({ ...prev, isStale: true }));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setChartData({ calculations, isStale: false }), 750);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [calculations]);

    const { yearly, cashFlow, monthly } = chartData.calculations;
    const foundationYear = parseInt(data.settings.foundationDate.substring(0, 4), 10);
    const foundationMonth = parseInt(data.settings.foundationDate.substring(5, 7), 10) - 1;
    const planningYears = data.settings.planningYears || 3;
    const { isStale } = chartData;

    return (
        <div className="uebersicht-container">
            <CollapsibleSection title={t('uebersicht.title', { years: planningYears })} defaultOpen={true}>
                <div className="uebersicht-summary-grid">
                    <div className="summary-card"><h3>{t('uebersicht.total_revenue')}</h3><p>{formatCurrency(calculations.totalOverview.totalRevenue)}</p></div>
                    <div className="summary-card"><h3>{t('uebersicht.total_profit_bt')}</h3><p>{formatCurrency(calculations.totalOverview.totalProfit)}</p></div>
                    <div className="summary-card"><h3>{t('uebersicht.payback_period')}</h3><p>{formatMonths(calculations.totalOverview.paybackMonths)}</p></div>
                    <div className="summary-card"><h3>{t('uebersicht.avg_ros')}</h3><p>{formatPercentage(calculations.totalOverview.averageROS)}</p></div>
                    <div className="summary-card"><h3>{t('uebersicht.final_roi')}</h3><p>{formatPercentage(calculations.totalOverview.finalROI)}</p></div>
                </div>
                <div className="year-detail-section">
                    <h3>{t('uebersicht.cash_flow_details')}</h3>
                    <div className="view-header-with-controls">
                        <div className="tabs-container">
                            {[...Array(planningYears).keys()].map(year => (
                                <div key={year} className={`tab ${activeNebenrechnungenYear === year ? 'active' : ''}`} onClick={() => setActiveNebenrechnungenYear(year)}>
                                    <span className="tab-label">{t('absatzplan.fiscal_year')} {year + 1} - {foundationYear + year}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="tab-content">
                        <NebenrechnungenTable 
                            yearIndex={activeNebenrechnungenYear}
                            foundationMonth={foundationMonth}
                            cashFlow={cashFlow}
                        />
                    </div>
                </div>
                <div className="year-detail-section">
                    <h3>{t('uebersicht.income_statement_overview')}</h3>
                    <YearlyOverviewTable 
                        yearly={yearly}
                        cashFlow={cashFlow}
                        planningYears={planningYears}
                        foundationYear={foundationYear}
                    />
                </div>
            </CollapsibleSection>

            <Szenariovergleich baseData={data} baseCalculations={chartData.calculations} isStale={isStale} />

            <CollapsibleSection title={t('uebersicht.annual_overviews')}>
                <div className="statistik-container">
                    {[...Array(planningYears).keys()].map(year => {
                        const yearMonthly = monthly[year] || [];
                        const monthlyGrossProfit = yearMonthly.map((m) => (m?.totalRevenue || 0) - (m?.variableCosts || 0));
                        const monthlyOpCosts = yearMonthly.map((m) => m?.operationalCosts || 0);
                        const monthlyDepreciation = yearMonthly.map((m) => m?.depreciation || 0);
                        const monthlyInterest = yearMonthly.map((m) => m?.interest || 0);
                        const monthlyWithdrawals = cashFlow.privateWithdrawals[year] || [];

                        const potentialDatasets = [
                            { label: t('uebersicht.bruttogewinn'), values: monthlyGrossProfit },
                            { label: t('uebersicht.operational_costs'), values: monthlyOpCosts },
                            { label: t('uebersicht.depreciation'), values: monthlyDepreciation },
                            { label: t('uebersicht.interest'), values: monthlyInterest },
                            { label: t('uebersicht.private_withdrawals'), values: monthlyWithdrawals }
                        ];

                        const chartDatasets = potentialDatasets;

                        return (
                            <div key={year} className="year-detail-section">
                                <div className="year-overview-grid">
                                    <div>
                                        <h3>{`${t('absatzplan.fiscal_year')} ${year + 1} - ${foundationYear + year}`}</h3>
                                        <div className="year-summary-cards">
                                            <div className="summary-card"><h3>{t('uebersicht.revenue_short')}</h3><p>{formatCurrency(calculations.yearly[year].revenue)}</p></div>
                                            <div className="summary-card"><h3>{t('uebersicht.profit_bt_short')}</h3><p>{formatCurrency(calculations.yearly[year].profitBeforeTax)}</p></div>
                                            <div className="summary-card"><h3>{t('uebersicht.net_cash_flow')}</h3><p>{formatCurrency(calculations.yearly[year].netCashFlow)}</p></div>
                                        </div>
                                        <div className="year-chart-container" style={{ marginTop: '2.5rem' }}>
                                            <LineChart
                                                title={t('uebersicht.monthly_kpi_trend')}
                                                labels={MONTHS}
                                                datasets={chartDatasets}
                                                isStale={isStale}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <h3>{t('uebersicht.kpi_overview')}</h3>
                                        <div className="table-container summary-kpi-table-wrapper">
                                            <table className="summary-kpi-table">
                                                <thead>
                                                    <tr><th>{t('uebersicht.kpi')}</th><th>{t('uebersicht.value')}</th></tr>
                                                </thead>
                                                <tbody>
                                                    <tr><td>{t('uebersicht.bruttogewinn')}</td><td>{formatCurrency(calculations.yearly[year].grossProfit)}</td></tr>
                                                    <tr><td>{t('uebersicht.operational_costs')}</td><td>{formatCurrency(calculations.yearly[year].operationalCosts)}</td></tr>
                                                    <tr><td>{t('uebersicht.depreciation')}</td><td>{formatCurrency(calculations.yearly[year].depreciation)}</td></tr>
                                                    <tr><td>{t('uebersicht.interest')}</td><td>{formatCurrency(calculations.yearly[year].interest)}</td></tr>
                                                    <tr><td>{t('uebersicht.private_withdrawals')}</td><td>{formatCurrency(calculations.yearly[year].privateWithdrawals)}</td></tr>
                                                    <tr className="total-row"><td colSpan={2}></td></tr>
                                                    <tr><td>{t('uebersicht.ros')}</td><td>{formatPercentage(calculations.yearly[year].returnOnSales)}</td></tr>
                                                    <tr><td>{t('uebersicht.roi')}</td><td>{formatPercentage(calculations.yearly[year].roi)}</td></tr>
                                                    <tr><td>{t('uebersicht.break_even')}</td><td>{calculations.yearly[year].breakEvenRevenue > 0 ? formatCurrency(calculations.yearly[year].breakEvenRevenue) : t('common.not_available')}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleSection>
            
            <BankenStatistik data={data} calculations={chartData.calculations} isStale={isStale} />
            <InvestorenStatistik data={data} calculations={chartData.calculations} isStale={isStale} />
            <FoerdergeberStatistik data={data} calculations={chartData.calculations} isStale={isStale} />
        </div>
    );
});