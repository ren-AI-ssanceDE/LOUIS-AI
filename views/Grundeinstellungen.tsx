/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LEGAL_FORMS } from '../constants.ts';
import type { CompanySettings } from '../types.ts';

interface GrundeinstellungenProps {
    settings: CompanySettings;
    onSettingsChange: (newSettings: CompanySettings) => void;
    onPrintRequest: () => void;
    onSendEmailRequest: () => void;
    onResetProjectRequest: () => void;
}

export const Grundeinstellungen = memo(({ settings, onSettingsChange, onPrintRequest, onSendEmailRequest, onResetProjectRequest }: GrundeinstellungenProps) => {
    const { t } = useTranslation();
    const planningYearsLimit = 5; // Standard limit for all users now

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue: string | number = value;
        if (name === 'planningYears') {
            finalValue = parseInt(value, 10);
            if (finalValue < 3) finalValue = 3;
            if (finalValue > planningYearsLimit) finalValue = planningYearsLimit;
        }
        if (name === 'taxRate') {
            finalValue = parseFloat(value);
            if (isNaN(finalValue)) finalValue = 0;
        }
        onSettingsChange({ ...settings, [name]: finalValue });
    };

    const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!e.target.value.trim()) {
            onSettingsChange({ ...settings, title: t('grundeinstellungen.project_without_name') });
        }
    };

    return (
        <div className="grundeinstellungen-layout">
            <div className="card">
                <h2>{t('grundeinstellungen.stammdaten')}</h2>
                <div className="form-group"><label>{t('grundeinstellungen.project_name')}</label><input type="text" name="title" value={settings.title} onChange={handleChange} onBlur={handleTitleBlur} /></div>
                <div className="form-group"><label>{t('grundeinstellungen.company_name')}</label><input type="text" name="companyName" value={settings.companyName} onChange={handleChange} /></div>
                <div className="form-group">
                    <label>{t('grundeinstellungen.legal_form')}</label>
                    <select name="legalForm" value={settings.legalForm} onChange={handleChange}>
                        {LEGAL_FORMS.map(form => (
                            <option key={form} value={form}>
                                {t(`legal_forms.${form}`, { defaultValue: form })}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group"><label>{t('grundeinstellungen.foundation_date')}</label><input type="date" name="foundationDate" value={settings.foundationDate} onChange={handleChange} /></div>
                <div className="form-group">
                    <label>{t('grundeinstellungen.planning_years')}</label>
                    <input
                        type="number"
                        name="planningYears"
                        value={settings.planningYears || 3}
                        onChange={handleChange}
                        min="3"
                        max={planningYearsLimit}
                    />
                     <p className="help-text">{t('grundeinstellungen.planning_years_hint', { max: planningYearsLimit })}</p>
                </div>
                <div className="form-group">
                    <label>{t('grundeinstellungen.tax_rate')}</label>
                    <input
                        type="number"
                        name="taxRate"
                        value={settings.taxRate !== undefined ? settings.taxRate : 0}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.1"
                    />
                    <p className="help-text">{t('grundeinstellungen.tax_rate_hint')}</p>
                </div>
                <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            name="isVatDeductible"
                            checked={!!settings.isVatDeductible}
                            onChange={(e) => onSettingsChange({ ...settings, isVatDeductible: e.target.checked })}
                        />
                        <span>{t('grundeinstellungen.vat_deductible')}</span>
                    </label>
                    <p className="help-text">{t('grundeinstellungen.vat_deductible_hint')}</p>
                </div>
            </div>
            <div className="grundeinstellungen-side-cards">
                <div className="card">
                    <h2>{t('grundeinstellungen.print_title')}</h2>
                    <p>{t('grundeinstellungen.print_text')}</p>
                    <button className="btn-primary" onClick={onPrintRequest} style={{width: '100%'}}>
                        {t('grundeinstellungen.print_button')}
                    </button>
                </div>
                <div className="card">
                    <h2>{t('grundeinstellungen.share_title')}</h2>
                    <p>{t('grundeinstellungen.share_text')}</p>
                    <button className="btn-secondary" onClick={onSendEmailRequest} style={{width: '100%'}}>
                        {t('grundeinstellungen.share_button')}
                    </button>
                    <p className="help-text" style={{marginTop: '1rem'}}>
                        {t('grundeinstellungen.share_hint')}
                    </p>
                </div>
                <div className="card">
                    <h2>{t('grundeinstellungen.reset_title')}</h2>
                    <p>{t('grundeinstellungen.reset_text')}</p>
                    <button className="btn-danger" onClick={onResetProjectRequest} style={{marginTop: '1rem', width: '100%'}}>
                        {t('grundeinstellungen.reset_button')}
                    </button>
                </div>
            </div>
        </div>
    );
});
