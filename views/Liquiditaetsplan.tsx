/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LiquiditaetsplanTable } from '../components/liquiditaetsplan/LiquiditaetsplanTable.tsx';
import type { FinancialData, CalculationResults } from '../types.ts';

export const Liquiditaetsplan = memo(({ data, calculations }: { data: FinancialData, calculations: CalculationResults }) => {
    const { t } = useTranslation();
    const planningYears = data.settings.planningYears || 3;
    const [activeYear, setActiveYear] = useState(0);
    const { cashFlow } = calculations;
    const foundationYear = parseInt(data.settings.foundationDate.substring(0, 4), 10);
    const foundationMonth = parseInt(data.settings.foundationDate.substring(5, 7), 10) - 1;

    return (
        <div className="card">
            <h2>{t('liquiditaet.title')}</h2>
            <div className="view-header-with-controls">
                <div className="tabs-container">
                    {[...Array(planningYears).keys()].map(year => (
                        <div key={year} className={`tab ${activeYear === year ? 'active' : ''}`} onClick={() => setActiveYear(year)}>
                            <span className="tab-label">{t('absatzplan.fiscal_year')} {year + 1} - {foundationYear + year}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="tab-content">
                <LiquiditaetsplanTable 
                    yearIndex={activeYear}
                    foundationMonth={foundationMonth}
                    foundationYear={foundationYear}
                    cashFlow={cashFlow}
                    data={data}
                />
            </div>
        </div>
    );
});
