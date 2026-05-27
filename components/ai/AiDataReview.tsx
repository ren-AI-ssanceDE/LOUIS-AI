/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deepClone } from '../../utils.ts';

import { FinancialData, OpCostCategoryKey } from '../../types.ts';

interface AiDataReviewProps {
    originalData: FinancialData;
    proposedData: FinancialData;
    onConfirm: (finalData: FinancialData) => void;
    onCancel: () => void;
}

export const AiDataReview = ({ proposedData, onConfirm, onCancel }: AiDataReviewProps) => {
    const { t } = useTranslation();
    const [editableData, setEditableData] = useState<FinancialData>(deepClone(proposedData));
    const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'costs' | 'private' | 'financing' | 'assets'>('settings');

    const opCostLabels: Record<string, string> = {
        geschaeftsfuehrung_gehalt: t('operational_costs.ceo_salaries'),
        personalkosten: t('operational_costs.personnel'),
        raumkosten: t('operational_costs.facility_costs'),
        buerokosten: t('operational_costs.office_costs'),
        fahrzeugkosten: t('operational_costs.vehicle_costs'),
        werbekosten: t('operational_costs.advertising_costs'),
        versicherungen_beitraege: t('operational_costs.insurance'),
        beratungskosten: t('operational_costs.consulting_costs'),
        reisekosten: t('operational_costs.travel_costs'),
        sonstige_betriebsausgaben: t('operational_costs.other_expenses'),
    };

    const handleValueChange = <T extends keyof FinancialData>(
        category: T, 
        index: number, 
        field: string, 
        value: string | number | boolean
    ) => {
        const newData = deepClone(editableData);
        if (category === 'products') {
            const product = newData.products[index] as unknown as Record<string, unknown>;
            if (product) product[field] = value;
        } else if (category === 'settings') {
            (newData.settings as unknown as Record<string, unknown>)[field] = value;
        } else if (category === 'privateNeeds') {
            const need = newData.privateNeeds[index] as unknown as Record<string, unknown>;
            if (need) need[field] = value;
        } else if (category === 'financing') {
            const finance = newData.financing[index] as unknown as Record<string, unknown>;
            if (finance) finance[field] = value;
        } else if (category === 'assets') {
            const asset = newData.assets[index] as unknown as Record<string, unknown>;
            if (asset) asset[field] = value;
        }
        setEditableData(newData);
    };

    const handleSave = () => {
        onConfirm(editableData);
    };

    const renderCostsTab = () => {
    const categories = Object.keys(editableData.operationalCosts || {}) as OpCostCategoryKey[];
    if (categories.length === 0) return <div className="p-4 text-center">{t('ai_assistant.body.review.empty.costs')}</div>;

    return (
        <div className="review-scroll-container">
            {categories.map(key => {
                const category = editableData.operationalCosts[key];
                    // Find first non-zero value for display hint
                    let firstValue = 0;
                    if (category && category.directCosts) {
                        for (let y = 0; y < category.directCosts.length; y++) {
                            const yearCosts = category.directCosts[y];
                            if (!yearCosts) continue;
                            for (let m = 0; m < 12; m++) {
                                if (yearCosts[m] !== 0) {
                                    firstValue = yearCosts[m];
                                    break;
                                }
                            }
                            if (firstValue !== 0) break;
                        }
                    }

                    return (
                        <div key={key} className="review-section">
                            <h4>{opCostLabels[key] || key}</h4>
                            <div className="form-group row">
                                <label>{t('ai_assistant.body.review.form.amount_standard')}</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={firstValue} 
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const newCosts = deepClone(editableData.operationalCosts);
                                        const catKey = key as OpCostCategoryKey;
                                        // Update all months with this value as a starting point
                                        if (!newCosts[catKey].directCosts || !Array.isArray(newCosts[catKey].directCosts)) {
                                            newCosts[catKey].directCosts = Array(5).fill(null).map(() => Array(12).fill(0));
                                        }
                                        for (let y = 0; y < 5; y++) {
                                            if (!newCosts[catKey].directCosts[y]) newCosts[catKey].directCosts[y] = Array(12).fill(0);
                                            for (let m = 0; m < 12; m++) {
                                                newCosts[catKey].directCosts[y][m] = val;
                                            }
                                        }
                                        setEditableData({ ...editableData, operationalCosts: newCosts });
                                    }} 
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="ai-data-review-container">
            <div className="ai-data-review-header">
                <h3>{t('ai_assistant.body.review.title')}</h3>
                <p>{t('ai_assistant.body.review.description')}</p>
            </div>

            <div className="ai-data-review-tabs overflow-x-auto">
                <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>{t('ai_assistant.body.review.tabs.settings')}</button>
                <button className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>{t('ai_assistant.body.review.tabs.products')}</button>
                <button className={`tab-btn ${activeTab === 'costs' ? 'active' : ''}`} onClick={() => setActiveTab('costs')}>{t('ai_assistant.body.review.tabs.costs')}</button>
                <button className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`} onClick={() => setActiveTab('private')}>{t('ai_assistant.body.review.tabs.private')}</button>
                <button className={`tab-btn ${activeTab === 'financing' ? 'active' : ''}`} onClick={() => setActiveTab('financing')}>{t('ai_assistant.body.review.tabs.financing')}</button>
                <button className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>{t('ai_assistant.body.review.tabs.assets')}</button>
            </div>

            <div className="ai-data-review-content">
                {activeTab === 'settings' && (
                    <div className="review-form">
                        <div className="form-group">
                            <label>{t('ai_assistant.body.review.form.company_name')}</label>
                            <input type="text" value={editableData.settings?.companyName || ''} onChange={(e) => handleValueChange('settings', 0, 'companyName', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>{t('ai_assistant.body.review.form.legal_form')}</label>
                            <input type="text" value={editableData.settings?.legalForm || ''} onChange={(e) => handleValueChange('settings', 0, 'legalForm', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>{t('ai_assistant.body.review.form.tax_rate')}</label>
                            <input type="number" value={editableData.settings?.taxRate || 0} onChange={(e) => handleValueChange('settings', 0, 'taxRate', parseFloat(e.target.value))} />
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <table className="review-table">
                        <thead><tr><th>{t('ai_assistant.body.review.table.name')}</th><th>{t('ai_assistant.body.review.table.price')}</th><th>{t('ai_assistant.body.review.table.var_costs')}</th></tr></thead>
                        <tbody>
                            {editableData.products?.length > 0 ? editableData.products.map((p, i) => (
                                <tr key={p.id || i}>
                                    <td><input type="text" value={p.name || ''} onChange={(e) => handleValueChange('products', i, 'name', e.target.value)} /></td>
                                    <td><input type="number" step="0.01" value={p.targetPrice || (p as any).target_price || 0} onChange={(e) => handleValueChange('products', i, 'targetPrice', parseFloat(e.target.value) || 0)} /></td>
                                    <td><input type="number" step="0.01" value={p.materialCosts || (p as any).materialkosten || 0} onChange={(e) => handleValueChange('products', i, 'materialCosts', parseFloat(e.target.value) || 0)} /></td>
                                </tr>
                            )) : <tr><td colSpan={3} className="text-center">{t('ai_assistant.body.review.empty.products')}</td></tr>}
                        </tbody>
                    </table>
                )}

                {activeTab === 'costs' && renderCostsTab()}

                {activeTab === 'private' && (
                    <table className="review-table">
                        <thead><tr><th>{t('ai_assistant.body.review.table.category')}</th><th>{t('ai_assistant.body.review.table.amount_month')}</th></tr></thead>
                        <tbody>
                            {editableData.privateNeeds?.length > 0 ? editableData.privateNeeds.map((n, i) => (
                                <tr key={n.id || i}>
                                    <td><strong>{n.category}</strong></td>
                                    <td>
                                        <input 
                                            type="number" 
                                            value={n.directCosts?.[0]?.[0] || 0} 
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newPrivate = deepClone(editableData.privateNeeds);
                                                if (!newPrivate[i].directCosts || !Array.isArray(newPrivate[i].directCosts)) {
                                                    newPrivate[i].directCosts = Array(5).fill(null).map(() => Array(12).fill(0));
                                                }
                                                // Simplified: apply to all months (up to 5 years)
                                                for(let y=0; y<5; y++) {
                                                    if (!newPrivate[i].directCosts[y]) newPrivate[i].directCosts[y] = Array(12).fill(0);
                                                    for(let m=0; m<12; m++) {
                                                        newPrivate[i].directCosts[y][m] = val;
                                                    }
                                                }
                                                setEditableData({ ...editableData, privateNeeds: newPrivate });
                                            }} 
                                        />
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={2} className="text-center">{t('ai_assistant.body.review.empty.private')}</td></tr>}
                        </tbody>
                    </table>
                )}

                {activeTab === 'financing' && (
                    <table className="review-table">
                        <thead><tr><th>{t('ai_assistant.body.review.table.source')}</th><th>{t('ai_assistant.body.review.table.amount')}</th><th>{t('ai_assistant.body.review.table.interest')}</th></tr></thead>
                        <tbody>
                            {editableData.financing?.length > 0 ? editableData.financing.map((f, i) => (
                                <tr key={f.id || i}>
                                    <td><input type="text" value={f.source || ''} onChange={(e) => handleValueChange('financing', i, 'source', e.target.value)} /></td>
                                    <td><input type="number" value={f.amount || 0} onChange={(e) => handleValueChange('financing', i, 'amount', parseFloat(e.target.value) || 0)} /></td>
                                    <td><input type="number" step="0.1" value={f.interestRate || 0} onChange={(e) => handleValueChange('financing', i, 'interestRate', parseFloat(e.target.value) || 0)} /></td>
                                </tr>
                            )) : <tr><td colSpan={3} className="text-center">{t('ai_assistant.body.review.empty.financing')}</td></tr>}
                        </tbody>
                    </table>
                )}

                {activeTab === 'assets' && (
                    <table className="review-table">
                        <thead><tr><th>{t('ai_assistant.body.review.table.investment')}</th><th>{t('ai_assistant.body.review.table.purchase_cost')}</th><th>{t('ai_assistant.body.review.table.useful_life')}</th></tr></thead>
                        <tbody>
                            {editableData.assets?.length > 0 ? editableData.assets.map((a, i) => (
                                <tr key={a.id || i}>
                                    <td><input type="text" value={a.name || ''} onChange={(e) => handleValueChange('assets', i, 'name', e.target.value)} /></td>
                                    <td><input type="number" value={a.purchasePrice || (a as any).purchase_price || 0} onChange={(e) => handleValueChange('assets', i, 'purchasePrice', parseFloat(e.target.value) || 0)} /></td>
                                    <td><input type="number" value={a.usefulLifeYears || (a as any).useful_life_years || 0} onChange={(e) => handleValueChange('assets', i, 'usefulLifeYears', parseInt(e.target.value) || 0)} /></td>
                                </tr>
                            )) : <tr><td colSpan={3} className="text-center">{t('ai_assistant.body.review.empty.assets')}</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="ai-data-review-actions">
                <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                <button className="btn-primary" onClick={handleSave}>
                    {t('ai_assistant.body.review.actions.confirm')}
                </button>
            </div>
        </div>
    );
};
