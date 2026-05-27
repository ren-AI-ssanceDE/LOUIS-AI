/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon.tsx';
import { AbsatzplanTable } from '../components/absatzplan/AbsatzplanTables.tsx';
import { ApplyToYearsModal } from '../components/ApplyToYearsModal.tsx';
import { useAbsatzplan } from '../hooks/useAbsatzplan.ts';
import type { Product, SalesData, CompanySettings } from '../types.ts';

interface AbsatzplanProps {
    products: Product[];
    sales: SalesData;
    setSales: (d: SalesData) => void;
    settings: CompanySettings;
}

const ResetConfirmModal = memo(({ yearIndex, onConfirm, onCancel }: { yearIndex: number, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('absatzplan.reset_year_title')}</h2>
                <p>{t('absatzplan.reset_year_confirm', { year: yearIndex + 1 })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('absatzplan.reset_button') || t('common.reset')}</button>
                </div>
            </div>
        </div>
    );
});

export const Absatzplan = memo(({ products, sales, setSales, settings }: AbsatzplanProps) => {
    const { t } = useTranslation();
    const planningYears = settings.planningYears || 3;
    const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);
    const foundationMonth = parseInt(settings.foundationDate.substring(5, 7), 10) - 1;
    const [activeYear, setActiveYear] = useState(0);

    // Ensure activeYear is within bounds
    const safeYear = activeYear >= planningYears ? 0 : activeYear;
    
    const {
        resetConfirm, setResetConfirm,
        applyToYearsConfirm, setApplyToYearsConfirm,
        tooltip,
        handleProductHover,
        handleProductMouseLeave,
        handleQuantityChange,
        handleFillForward,
        performResetYear,
        performApplyToYears
    } = useAbsatzplan({ sales, setSales, planningYears });
    
    const visibleMonths = Array.from({ length: 12 }, (_, i) => i).filter(m => !(activeYear === 0 && m < foundationMonth));

    return (
        <div className="card">
            {tooltip && (
                <div
                    className="product-description-tooltip visible"
                    style={{
                        top: tooltip.y,
                        left: tooltip.x,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
            {resetConfirm !== null && (
                <ResetConfirmModal 
                    yearIndex={resetConfirm}
                    onConfirm={() => performResetYear(resetConfirm)}
                    onCancel={() => setResetConfirm(null)}
                />
            )}
            {applyToYearsConfirm !== null && (
                <ApplyToYearsModal
                    sourceYear={applyToYearsConfirm}
                    planningYears={planningYears}
                    foundationYear={foundationYear}
                    onConfirm={(targetYears) => performApplyToYears(applyToYearsConfirm, targetYears)}
                    onCancel={() => setApplyToYearsConfirm(null)}
                />
            )}
            <h2>{t('absatzplan.title')}</h2>
            <div className="view-header-with-controls">
                <div className="tabs-container">
                    <div style={{ position: 'relative', zIndex: 1, marginRight: '1rem', display: 'flex', gap: '0.5rem' }}>
                         <button
                            className="btn-icon-primary"
                            onClick={() => setApplyToYearsConfirm(activeYear)}
                            title={t('apply_to_years.title', { defaultValue: 'Daten übernehmen' })}
                            aria-label={t('apply_to_years.title', { defaultValue: 'Daten übernehmen' })}
                        >
                            <Icon icon="copy" size={16} />
                        </button>
                         <button
                            className="btn-icon-danger"
                            onClick={() => setResetConfirm(activeYear)}
                            title={t('absatzplan.reset_button_hint', { year: activeYear + 1 })}
                            aria-label={t('absatzplan.reset_button_hint', { year: activeYear + 1 })}
                        >
                            <Icon icon="trash" size={16} />
                        </button>
                    </div>
                    {[...Array(planningYears).keys()].map(year => (
                        <div key={year} className={`tab ${safeYear === year ? 'active' : ''}`} onClick={() => setActiveYear(year)}>
                            <span className="tab-label">{t('absatzplan.fiscal_year')} {year + 1} - {foundationYear + year}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="tab-content">
                <AbsatzplanTable 
                    year={safeYear}
                    visibleMonths={visibleMonths}
                    products={products}
                    sales={sales}
                    handleFillForward={handleFillForward}
                    handleQuantityChange={handleQuantityChange}
                    handleProductHover={handleProductHover}
                    handleProductMouseLeave={handleProductMouseLeave}
                    foundationMonth={foundationMonth}
                />
            </div>
        </div>
    );
});
