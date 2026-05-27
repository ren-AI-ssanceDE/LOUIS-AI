/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface ApplyToYearsModalProps {
    sourceYear: number;
    planningYears: number;
    foundationYear: number;
    onConfirm: (targetYears: number[]) => void;
    onCancel: () => void;
}

export const ApplyToYearsModal = memo(({ sourceYear, planningYears, foundationYear, onConfirm, onCancel }: ApplyToYearsModalProps) => {
    const { t } = useTranslation();
    const [selectedYears, setSelectedYears] = useState<number[]>([]);

    const toggleYear = (year: number) => {
        if (selectedYears.includes(year)) {
            setSelectedYears(selectedYears.filter(y => y !== year));
        } else {
            setSelectedYears([...selectedYears, year]);
        }
    };

    const handleSelectAll = () => {
        const allOtherYears = Array.from({ length: planningYears }, (_, i) => i).filter(y => y !== sourceYear);
        setSelectedYears(allOtherYears);
    };

    const handleDeselectAll = () => {
        setSelectedYears([]);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('apply_to_years.title')}</h2>
                <p>
                    {t('apply_to_years.hint', { year: sourceYear + 1 })}
                </p>

                <div className="year-selection-grid" style={{ margin: '1.5rem 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    {Array.from({ length: planningYears }, (_, i) => i).map(year => (
                        <label 
                            key={year} 
                            className={`checkbox-label ${year === sourceYear ? 'disabled' : ''}`}
                            style={{ 
                                padding: '0.75rem', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--border-radius-sm)',
                                cursor: year === sourceYear ? 'not-allowed' : 'pointer',
                                backgroundColor: selectedYears.includes(year) ? 'var(--primary-light)' : 'transparent',
                                opacity: year === sourceYear ? 0.5 : 1
                            }}
                        >
                            <input 
                                type="checkbox" 
                                checked={selectedYears.includes(year)} 
                                onChange={() => toggleYear(year)}
                                disabled={year === sourceYear}
                            />
                            <span>{t('apply_to_years.fiscal_year_short')} {year + 1} ({foundationYear + year})</span>
                        </label>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button className="btn-link" onClick={handleSelectAll}>
                        {t('apply_to_years.select_all')}
                    </button>
                    <button className="btn-link" onClick={handleDeselectAll}>
                        {t('apply_to_years.deselect_all')}
                    </button>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button 
                        className="btn-primary" 
                        onClick={() => onConfirm(selectedYears)}
                        disabled={selectedYears.length === 0}
                    >
                        {t('apply_to_years.confirm_button')}
                    </button>
                </div>
            </div>
        </div>
    );
});
