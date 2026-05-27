/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils.ts';
import { NumberInput } from '../NumberInput.tsx';
import { Icon } from '../Icon.tsx';
import type { PrivateNeed, PrivateNeedSubItem } from '../../types.ts';

export const PrivateNeedSubItemRow = memo(({ subItem, categoryId, year, visibleMonths, onSubItemCostChange, onFillForward, onEdit, onHover, onHoverEnd }: { subItem: PrivateNeedSubItem, categoryId: string, year: number, visibleMonths: number[], onSubItemCostChange: (categoryId: string, subItemId: string, yearIndex: number, monthIndex: number, value: number) => void, onFillForward: Function, onEdit: (categoryId: string, subItem: PrivateNeedSubItem) => void, onHover: (e: React.MouseEvent, description?: string) => void, onHoverEnd: () => void }) => {
    const { t } = useTranslation();
    return (
        <tr className="opcost-sub-row">
            <td className="sticky-col">
                <div className="row-header sub-label-deep opcost-label-content">
                     <button className="btn-icon-square" onClick={() => onEdit(categoryId, subItem)} title={t('common.edit_item', { defaultValue: `Unterpunkt "${subItem.name}" bearbeiten`, name: subItem.name })}>
                        <Icon icon="edit" size={16} />
                    </button>
                    <div
                        className="opcost-sub-row-name"
                        onMouseEnter={(e) => onHover(e, subItem.description)}
                        onMouseLeave={onHoverEnd}
                    >
                       {subItem.name}
                    </div>
                </div>
            </td>
            {visibleMonths.map(month => (
                <td key={month} className="input-cell">
                    <div className="input-cell-content with-fill-forward">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onFillForward(categoryId, subItem.id, year, month); }} 
                            title={t('common.fill_forward_hint')} 
                            className="btn-fill-forward"
                            type="button"
                        >
                            <Icon icon="fill-forward" size={16} />
                        </button>
                        <NumberInput value={subItem.costs[year]?.[month]} onChange={num => onSubItemCostChange(categoryId, subItem.id, year, month, num)} min={0} />
                    </div>
                </td>
            ))}
            <td className="total-col">
                <span>{formatCurrency((subItem.costs[year] || []).reduce((a,b)=>a+b,0))}</span>
            </td>
        </tr>
    );
});

export const PrivateNeedCategoryRow = memo(({ need, year, visibleMonths, onToggleExpand, onDirectCostChange, onFillForward }: { need: PrivateNeed, year: number, visibleMonths: number[], onToggleExpand: Function, onDirectCostChange: Function, onFillForward: Function }) => {
    const { t } = useTranslation();
    const useSubItems = need.subItems && need.subItems.length > 0;
    const mainRowValues = Array(12).fill(0).map((_, month) => {
        if (useSubItems) {
            return need.subItems.reduce((sum, item) => sum + (item.costs[year]?.[month] || 0), 0);
        }
        return need.directCosts[year]?.[month] || 0;
    });

    const toggleIcon = (
        <span
            className={`opcost-toggle ${need.isExpanded ? 'expanded' : ''}`}
            onClick={() => onToggleExpand(need.id)}
        >
            <Icon icon="chevron-right" size={16} />
        </span>
    );

    return (
        <tr className="opcost-main-row">
            <td className="sticky-col">
                <div className="row-header opcost-label-content">
                    {toggleIcon}
                    <span>{need.category}</span>
                </div>
            </td>
            {visibleMonths.map(month => (
                <td key={month} className={`input-cell ${useSubItems ? 'disabled' : ''}`}>
                    {useSubItems ? (
                        <span className="calculated-input">
                            {formatCurrency(mainRowValues[month])}
                        </span>
                    ) : (
                        <div className="input-cell-content with-fill-forward">
                            <button
                                onClick={(e) => { e.stopPropagation(); onFillForward(need.id, year, month); }}
                                title={t('common.fill_forward_hint')}
                                className="btn-fill-forward"
                                type="button"
                            >
                                <Icon icon="fill-forward" size={16} />
                            </button>
                            <NumberInput value={need.directCosts[year]?.[month]} onChange={num => onDirectCostChange(need.id, year, month, num)} min={0} />
                        </div>
                    )}
                </td>
            ))}
            <td className="total-col">
                <span>{formatCurrency(mainRowValues.reduce((a, b) => a + b, 0))}</span>
            </td>
        </tr>
    );
});
