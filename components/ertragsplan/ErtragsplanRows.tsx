/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils.ts';
import { NumberInput } from '../NumberInput.tsx';
import { Icon } from '../Icon.tsx';
import type { OpCostSubItem, OpCostCategory, OpCostCategoryKey } from '../../types.ts';

export const StaticCalculationRow = memo(({ label, values, isBold = false, visibleMonths, sum }: { label: string, values: number[], isBold?: boolean, visibleMonths: number[], sum: (arr: (number | undefined)[]) => number }) => {
    const total = sum(values);
    return (
        <tr className={isBold ? 'total-row' : ''}>
            <td className="sticky-col"><div className="row-header">{label}</div></td>
            {visibleMonths.map(m => (
                <td key={m} className="input-cell disabled">
                    <span>
                        {formatCurrency(values[m])}
                    </span>
                </td>
            ))}
            <td className="total-col">{formatCurrency(total)}</td>
        </tr>
    );
});

export interface OpCostSubItemRowProps {
    subItem: OpCostSubItem;
    categoryKey: OpCostCategoryKey;
    yearIndex: number;
    visibleMonths: number[];
    onSubItemCostChange: (categoryKey: OpCostCategoryKey, subItemId: string, yearIndex: number, monthIndex: number, value: number) => void;
    onFillForward: (categoryKey: OpCostCategoryKey, subItemId: string, yearIndex: number, monthIndex: number) => void;
    onEdit: (categoryKey: OpCostCategoryKey, subItem: OpCostSubItem) => void;
    onHover: (e: React.MouseEvent, description?: string) => void;
    onHoverEnd: () => void;
    sum: (arr: (number | undefined)[]) => number;
}

export const OpCostSubItemRow = memo(({ subItem, categoryKey, yearIndex, visibleMonths, onSubItemCostChange, onFillForward, onEdit, onHover, onHoverEnd, sum }: OpCostSubItemRowProps) => {
    const { t } = useTranslation();
    return (
        <tr className="opcost-sub-row">
            <td className="sticky-col">
                 <div className="row-header sub-label-deep opcost-label-content">
                    <button className="btn-icon-square" onClick={() => onEdit(categoryKey, subItem)} title={t('ertragsplan.edit_subitem_title')}>
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
            {visibleMonths.map(monthIndex => (
                <td key={monthIndex} className="input-cell">
                        <div className="input-cell-content with-fill-forward">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onFillForward(categoryKey, subItem.id, yearIndex, monthIndex); }} 
                            title={t('absatzplan.fill_forward_hint')} 
                            className="btn-fill-forward"
                            type="button"
                        >
                            <Icon icon="fill-forward" size={16} />
                        </button>
                        <NumberInput value={subItem.costs[yearIndex]?.[monthIndex]} onChange={num => onSubItemCostChange(categoryKey, subItem.id, yearIndex, monthIndex, num)} min={0} />
                    </div>
                </td>
            ))}
            <td className="total-col">
                <span>{formatCurrency(sum(subItem.costs[yearIndex] || []))}</span>
            </td>
        </tr>
    );
});

export interface OpCostCategoryRowProps {
    categoryKey: OpCostCategoryKey;
    label: string;
    categoryData: OpCostCategory;
    mainRowValues: number[];
    yearIndex: number;
    visibleMonths: number[];
    onToggleExpand: (categoryKey: OpCostCategoryKey) => void;
    onCostChange: (categoryKey: OpCostCategoryKey, yearIndex: number, monthIndex: number, value: number) => void;
    onFillForward: (categoryKey: OpCostCategoryKey, yearIndex: number, monthIndex: number) => void;
    sum: (arr: (number | undefined)[]) => number;
}

export const OpCostCategoryRow = memo(({ categoryKey, label, categoryData, mainRowValues, yearIndex, visibleMonths, onToggleExpand, onCostChange, onFillForward, sum }: OpCostCategoryRowProps) => {
    const { t } = useTranslation();
    const useSubItems = categoryData.subItems.length > 0;
    const isReallyCalculated = useSubItems; 

    const toggleIcon = (
        <span
            className={`opcost-toggle ${categoryData.isExpanded ? 'expanded' : ''}`}
            onClick={() => onToggleExpand(categoryKey)}
        >
            <Icon icon="chevron-right" size={16} />
        </span>
    );

    return (
        <tr className="opcost-main-row">
            <td className="sticky-col">
                <div className="row-header opcost-label-content">
                    {toggleIcon}
                    <span>{`- ${label}`}</span>
                </div>
            </td>
            {visibleMonths.map(monthIndex => {
                const displayValue = mainRowValues[monthIndex];
                
                return (
                    <td key={monthIndex} className={`input-cell ${isReallyCalculated ? 'disabled' : ''}`}>
                        {isReallyCalculated ? (
                            <span className="calculated-input">
                                {formatCurrency(displayValue)}
                            </span>
                        ) : (
                            <div className="input-cell-content with-fill-forward">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onFillForward(categoryKey, yearIndex, monthIndex); }} 
                                    title={t('absatzplan.fill_forward_hint')} 
                                    className="btn-fill-forward"
                                    type="button"
                                >
                                    <Icon icon="fill-forward" size={16} />
                                </button>
                                <NumberInput
                                    value={categoryData.directCosts[yearIndex]?.[monthIndex]}
                                    onChange={num => onCostChange(categoryKey, yearIndex, monthIndex, num)}
                                    min={0}
                                />
                            </div>
                        )}
                    </td>
                );
            })}
            <td className="total-col">{formatCurrency(sum(mainRowValues))}</td>
        </tr>
    );
});
