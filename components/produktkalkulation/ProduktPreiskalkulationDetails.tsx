/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils.ts';
import { NumberInput } from '../NumberInput.tsx';
import type { Product, ProductCategory } from '../../types.ts';

export interface ProductDetailsProps {
    product: Product;
    categorySettings?: ProductCategory;
    onUpdateField: (id: string, field: keyof Product, value: string | number) => void;
    onWareneinsatzChange: (id: string, newPercent: number) => void;
    productCategories: ProductCategory[];
}

export const ProductDetails = memo(({ product, categorySettings, onUpdateField, onWareneinsatzChange, productCategories }: ProductDetailsProps) => {
    const { t } = useTranslation();
    const isWareneinsatzFromCategory = categorySettings?.cogsPercentage != null;
    const isRevenueDelayFromCategory = categorySettings?.revenueDelayWeeks != null;
    const isReservePercentFromCategory = categorySettings?.reservePercentage != null;
    const isReserveDelayFromCategory = categorySettings?.reserveDelayWeeks != null;

    const costCategories: { key: keyof Product; label: string }[] = [
        { key: 'materialCosts', label: t('produktkalkulation_details.material_costs') },
        { key: 'productionCosts', label: t('produktkalkulation_details.production_costs') },
        { key: 'adminCosts', label: t('produktkalkulation_details.admin_costs') },
        { key: 'marketingSalesCosts', label: t('produktkalkulation_details.marketing_sales_costs') },
        { key: 'marginPercentage', label: t('produktkalkulation_details.margin') },
        { key: 'otherCosts', label: t('produktkalkulation_details.other_costs') },
    ];

    const totalVariableCosts = costCategories.reduce((sum, cat) => sum + (product[cat.key] as number), 0);
    const rohgewinn = product.targetPrice - totalVariableCosts;
    const wareneinsatzPercent = product.targetPrice > 0 ? (Math.round((totalVariableCosts / product.targetPrice * 100) * 100) / 100) : 0;
    const isWareneinsatzLocked = isWareneinsatzFromCategory || product.materialCosts > 0 || product.productionCosts > 0 || product.adminCosts > 0 || product.marketingSalesCosts > 0 || product.marginPercentage > 0;

    return (
        <div className="produkt-kalkulation-grid">
            <div className="table-container product-details-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('produktkalkulation_details.description')}</th>
                            <th>{t('produktkalkulation_details.unit')}</th>
                            <th>{t('produktkalkulation_details.value')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="sub-row">
                            <td className="sub-label">{t('produktkalkulation_details.sales_price_net')}</td>
                            <td>€</td>
                            <td className="input-cell">
                                <NumberInput value={product.targetPrice} onChange={num => onUpdateField(product.id, 'targetPrice', num)} min={0} />
                            </td>
                        </tr>
                        <tr className="sub-row">
                            <td className="sub-label">{t('produktkalkulation_details.vat')}</td>
                            <td>%</td>
                            <td className="input-cell">
                                <NumberInput value={product.vatRate} onChange={num => onUpdateField(product.id, 'vatRate', num)} min={0} />
                            </td>
                        </tr>
                        <tr className="total-row sub-row">
                            <td className="sub-label">{t('produktkalkulation_details.sales_price_gross')}</td>
                            <td>€</td>
                            <td className="input-cell disabled">
                                <span>{formatCurrency(product.targetPrice * (1 + product.vatRate / 100))}</span>
                            </td>
                        </tr>
                        <tr className="sub-row-header">
                            <td colSpan={3}>{t('produktkalkulation_details.variable_costs_header')}</td>
                        </tr>
                        {costCategories.map(cat => (
                            <tr className="sub-row" key={cat.key}>
                                <td className="sub-label">{cat.label}</td>
                                <td>€</td>
                                <td className="input-cell">
                                    <NumberInput 
                                        value={product[cat.key] as number} 
                                        onChange={num => onUpdateField(product.id, cat.key, num)} 
                                        disabled={isWareneinsatzFromCategory} 
                                        title={isWareneinsatzFromCategory ? t('produktkalkulation_details.cogs_category_controlled') : ""} 
                                        min={0} 
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr className="total-row sub-row">
                            <td className="sub-label">{t('produktkalkulation_details.total_variable_costs')}</td>
                            <td>€</td>
                            <td className="input-cell disabled">
                                <span>{formatCurrency(totalVariableCosts)}</span>
                            </td>
                        </tr>
                        <tr className="total-row sub-row">
                            <td className="sub-label">{t('produktkalkulation_details.gross_profit')}</td>
                            <td>€</td>
                            <td className="input-cell disabled">
                                <span>{formatCurrency(rohgewinn)}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div>
                <div className="side-settings-card">
                    <div className="form-group">
                        <label>{t('produktkalkulation_details.cogs_percent')}</label>
                        <NumberInput 
                            value={isWareneinsatzFromCategory ? categorySettings!.cogsPercentage! : wareneinsatzPercent} 
                            onChange={num => onWareneinsatzChange(product.id, num)} 
                            disabled={isWareneinsatzLocked} 
                            title={isWareneinsatzFromCategory ? t('produktkalkulation_details.cogs_category_controlled') : (isWareneinsatzLocked ? t('produktkalkulation_details.cogs_auto_calc') : t('produktkalkulation_details.cogs_manual_hint'))} 
                            min={0} 
                        />
                        <p className="help-text">{t('produktkalkulation_details.cogs_hint')}</p>
                    </div>
                    
                    <h3>{t('produktkalkulation_details.revenue_delay_header')}</h3>
                    <div className="form-group">
                        <label>{t('produktkalkulation_details.revenue_delay_weeks')}</label>
                        <NumberInput 
                            value={isRevenueDelayFromCategory ? categorySettings!.revenueDelayWeeks! : (product.revenueDelayWeeks || 0)} 
                            onChange={num => onUpdateField(product.id, 'revenueDelayWeeks', Math.round(num))} 
                            disabled={isRevenueDelayFromCategory} 
                            title={isRevenueDelayFromCategory ? t('produktkalkulation_details.cogs_category_controlled') : ""} 
                            min={0} 
                        />
                        <p className="help-text">{t('produktkalkulation_details.revenue_delay_hint')}</p>
                    </div>
                    <div className="form-group">
                        <label>{t('produktkalkulation_details.reserve_percent')}</label>
                        <NumberInput 
                            value={isReservePercentFromCategory ? categorySettings!.reservePercentage! : (product.reservePercentage || 0)} 
                            onChange={num => onUpdateField(product.id, 'reservePercentage', num)} 
                            disabled={isReservePercentFromCategory} 
                            title={isReservePercentFromCategory ? t('produktkalkulation_details.cogs_category_controlled') : ""} 
                            min={0} 
                        />
                        <p className="help-text">{t('produktkalkulation_details.reserve_hint')}</p>
                    </div>
                    <div className="form-group">
                        <label>{t('produktkalkulation_details.reserve_delay_weeks')}</label>
                        <NumberInput 
                            value={isReserveDelayFromCategory ? categorySettings!.reserveDelayWeeks! : (product.reserveDelayWeeks || 0)} 
                            onChange={num => onUpdateField(product.id, 'reserveDelayWeeks', Math.round(num))} 
                            disabled={isReserveDelayFromCategory} 
                            title={isReserveDelayFromCategory ? t('produktkalkulation_details.cogs_category_controlled') : ""} 
                            min={0} 
                        />
                        <p className="help-text">{t('produktkalkulation_details.reserve_delay_hint')}</p>
                    </div>
                </div>
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h2>{t('produktkalkulation_details.desc_assignment_title')}</h2>
                    <div className="form-group">
                        <label>{t('produktkalkulation_details.description')}</label>
                        <textarea
                            style={{ minHeight: '120px', resize: 'vertical' }}
                            value={product.description || ''}
                            onChange={e => onUpdateField(product.id, 'description', e.target.value)}
                            placeholder={t('produktkalkulation_details.desc_placeholder')}
                        />
                    </div>
                     <div className="form-group">
                        <label>{t('produktkalkulation_details.category_label')}</label>
                        <select value={product.categoryId || ''} onChange={e => onUpdateField(product.id, 'categoryId', e.target.value)}>
                            <option value="">{t('produktkalkulation.filter_none')}</option>
                            {(productCategories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
});
