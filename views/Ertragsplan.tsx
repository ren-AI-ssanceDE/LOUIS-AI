/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils.ts';
import { MONTHS } from '../constants.ts';
import { Icon } from '../components/Icon.tsx';
import type { FinancialData, OperationalCostsData, OpCostCategoryKey, CalculationResults } from '../types.ts';
import { AddModal, EditModal, DeleteConfirmModal, ResetConfirmModal } from '../components/ertragsplan/ErtragsplanModals.tsx';
import { ApplyToYearsModal } from '../components/ApplyToYearsModal.tsx';
import { StaticCalculationRow, OpCostSubItemRow, OpCostCategoryRow } from '../components/ertragsplan/ErtragsplanRows.tsx';
import { useErtragsplan } from '../hooks/useErtragsplan.ts';

interface ErtragsplanProps {
    data: FinancialData;
    calculations: CalculationResults;
    onOpCostsChange: (d: OperationalCostsData) => void;
}

export const Ertragsplan = memo(({data, calculations, onOpCostsChange}: ErtragsplanProps) => {
    const { t } = useTranslation();
    const planningYears = data.settings.planningYears || 3;
    const [activeYear, setActiveYear] = useState(0);
    
    // Ensure activeYear is within bounds (e.g. after planningYears reduction)
    const safeYear = activeYear >= planningYears ? 0 : activeYear;
    
    const { monthly } = calculations;
    const foundationYear = parseInt(data.settings.foundationDate.substring(0, 4), 10);
    const foundationMonth = parseInt(data.settings.foundationDate.substring(5, 7), 10) - 1;

    const totalStartupCost = useMemo(() => Object.entries(data.startupCosts || {}).reduce((sum, [_, val]) => typeof val === 'number' ? sum + val : sum, 0), [data.startupCosts]);

    const {
        addModalState, setAddModalState,
        editingState, setEditingState,
        deleteConfirmState, setDeleteConfirmState,
        resetConfirm, setResetConfirm,
        applyToYearsConfirm, setApplyToYearsConfirm,
        tooltip,
        performResetYear,
        performApplyToYears,
        handleOpCostChange,
        handleSubItemCostChange,
        handleFillForwardDirect,
        handleFillForwardSubItem,
        handleToggleExpand,
        handleAddSubItem,
        handleSaveSubItem,
        handleDeleteSubItem,
        handleSubItemHover,
        handleSubItemHoverEnd
    } = useErtragsplan({ data, onOpCostsChange, planningYears });

    const isSoleProprietor = data.settings.legalForm === 'Gewerbe (Einzelunternehmen)' || data.settings.legalForm === 'Freiberufliche Selbstständigkeit';

    const costCategories: { key: OpCostCategoryKey, label: string }[] = ([
        { key: 'managementSalary', label: t('operational_costs.ceo_salaries') },
        { key: 'personnelCosts', label: t('operational_costs.personnel') },
        { key: 'rentAndFacilities', label: t('operational_costs.facility_costs') },
        { key: 'officeSupplies', label: t('operational_costs.office_costs') },
        { key: 'vehicleExpenses', label: t('operational_costs.vehicle_costs') },
        { key: 'advertisingCosts', label: t('operational_costs.advertising_costs') },
        { key: 'insuranceAndFees', label: t('operational_costs.insurance') },
        { key: 'consultingCosts', label: t('operational_costs.consulting_costs') },
        { key: 'travelExpenses', label: t('operational_costs.travel_costs') },
        { key: 'otherOperatingExpenses', label: t('operational_costs.other_expenses') },
    ] as { key: OpCostCategoryKey, label: string }[]).filter(cat => {
        if (isSoleProprietor && cat.key === 'managementSalary') return false;
        return true;
    });
    
    const renderYearTable = (yearIndex: number) => {
        const visibleMonths = Array.from({ length: 12 }, (_, i) => i).filter(m => !(yearIndex === 0 && m < foundationMonth));
        const isShortYear = yearIndex === 0 && visibleMonths.length < 12;
        const sum = (arr: (number | undefined)[]) => arr.reduce((a: number, b: number | undefined) => a + (b || 0), 0);

        return (
            <div className={`table-container ${isShortYear ? 'table-container-fit-content' : ''}`}>
                <table>
                    <thead className="sticky-header">
                        <tr>
                            <th className="sticky-col"><div className="row-header">{t('ertragsplan.position')}</div></th>
                            {visibleMonths.map(m => <th key={m}>{t(`common.months.${m}`, { defaultValue: MONTHS[m] })}</th>)}
                            <th className="total-col">{t('common.total')} {foundationYear + yearIndex}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <StaticCalculationRow label={t('ertragsplan.revenue')} values={monthly[yearIndex].map((m) => m.totalRevenue)} visibleMonths={visibleMonths} sum={sum} isBold />
                        <StaticCalculationRow label={t('ertragsplan.variable_costs')} values={monthly[yearIndex].map((m) => m.variableCosts)} visibleMonths={visibleMonths} sum={sum} />
                        <StaticCalculationRow label={t('ertragsplan.gross_profit')} values={monthly[yearIndex].map((m) => m.totalRevenue - m.variableCosts)} visibleMonths={visibleMonths} sum={sum} isBold />

                        <tr className="sub-row-header">
                            <td className="sticky-col"><div className="row-header">{t('ertragsplan.operational_costs_header')}</div></td>
                            <td colSpan={visibleMonths.length + 1}></td>
                        </tr>
                        {costCategories.map(cat => {
                            const categoryData = data.operationalCosts[cat.key];
                            const useSubItems = categoryData.subItems.length > 0;
                            const isSonstige = cat.key === 'otherOperatingExpenses';

                            const mainRowValues = Array(12).fill(0).map((_, m) => {
                                let val = 0;
                                if (useSubItems) {
                                    val = categoryData.subItems.reduce((total, item) => total + (item.costs[yearIndex]?.[m] || 0), 0);
                                } else {
                                    val = categoryData.directCosts[yearIndex]?.[m] || 0;
                                }

                                if (isSonstige && yearIndex === 0 && m === foundationMonth) {
                                    val += totalStartupCost;
                                }
                                return val;
                            });
                            
                            return (
                                <React.Fragment key={cat.key}>
                                    <OpCostCategoryRow
                                        categoryKey={cat.key}
                                        label={cat.label}
                                        categoryData={categoryData}
                                        mainRowValues={mainRowValues}
                                        yearIndex={yearIndex}
                                        visibleMonths={visibleMonths}
                                        onToggleExpand={handleToggleExpand}
                                        onCostChange={handleOpCostChange}
                                        onFillForward={handleFillForwardDirect}
                                        sum={sum}
                                    />
                                    {categoryData.isExpanded && (
                                        <>
                                            {isSonstige && yearIndex === 0 && totalStartupCost > 0 && (
                                                <tr className="opcost-sub-row virtual-sub-row">
                                                    <td className="sticky-col">
                                                        <div className="row-header sub-label-deep opcost-label-content">
                                                            <div className="btn-icon-square disabled" title={t('ertragsplan.system_generated_subitem')}>
                                                                <Icon icon="info" size={16} />
                                                            </div>
                                                            <div className="opcost-sub-row-name">{t('ertragsplan.startup_costs_label')}</div>
                                                        </div>
                                                    </td>
                                                    {visibleMonths.map(monthIndex => (
                                                        <td key={monthIndex} className="input-cell disabled">
                                                            <span className="calculated-input">
                                                                {monthIndex === foundationMonth ? formatCurrency(totalStartupCost) : formatCurrency(0)}
                                                            </span>
                                                        </td>
                                                    ))}
                                                    <td className="total-col">
                                                        <span>{formatCurrency(totalStartupCost)}</span>
                                                    </td>
                                                </tr>
                                            )}
                                            {categoryData.subItems
                                                .filter(subItem => subItem.activeInYears === undefined || subItem.activeInYears.includes(yearIndex))
                                                .map(subItem => (
                                                <OpCostSubItemRow
                                                    key={subItem.id}
                                                    subItem={subItem}
                                                    categoryKey={cat.key}
                                                    yearIndex={yearIndex}
                                                    visibleMonths={visibleMonths}
                                                    onSubItemCostChange={handleSubItemCostChange}
                                                    onFillForward={handleFillForwardSubItem}
                                                    onEdit={(categoryKey, subItem) => setEditingState({ categoryKey, subItem })}
                                                    onHover={handleSubItemHover}
                                                    onHoverEnd={handleSubItemHoverEnd}
                                                    sum={sum}
                                                />
                                            ))}
                                            <tr>
                                                <td className="sticky-col add-subitem-cell">
                                                    <button className="btn-icon-primary" onClick={() => setAddModalState({ category: cat.key })} title={t('ertragsplan.add_subitem_title')}>
                                                        <Icon icon="plus" size={18} strokeWidth="2.5" />
                                                    </button>
                                                </td>
                                                <td colSpan={visibleMonths.length + 1}></td>
                                            </tr>
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        <StaticCalculationRow label={t('ertragsplan.sum_operational_costs')} values={monthly[yearIndex].map((m) => m.operationalCosts)} visibleMonths={visibleMonths} sum={sum} isBold />
                        <StaticCalculationRow label={t('ertragsplan.depreciation')} values={monthly[yearIndex].map((m) => m.depreciation)} visibleMonths={visibleMonths} sum={sum} />
                        <StaticCalculationRow label={t('ertragsplan.ebit')} values={monthly[yearIndex].map((m) => m.profitBeforeTax + m.interest)} visibleMonths={visibleMonths} sum={sum} isBold />
                        <StaticCalculationRow label={t('ertragsplan.interest')} values={monthly[yearIndex].map((m) => m.interest)} visibleMonths={visibleMonths} sum={sum} />
                        <StaticCalculationRow label={t('ertragsplan.ebt')} values={monthly[yearIndex].map((m) => m.profitBeforeTax)} visibleMonths={visibleMonths} sum={sum} isBold />
                        <StaticCalculationRow label={t('ertragsplan.taxes')} values={monthly[yearIndex].map((m) => m.taxAmount)} visibleMonths={visibleMonths} sum={sum} />
                        <StaticCalculationRow label={t('ertragsplan.eat')} values={monthly[yearIndex].map((m) => m.profitAfterTax)} visibleMonths={visibleMonths} sum={sum} isBold />
                        {isSoleProprietor && (
                            <>
                                <StaticCalculationRow label={t('ertragsplan.private_withdrawals')} values={monthly[yearIndex].map((m) => m.privateWithdrawals)} visibleMonths={visibleMonths} sum={sum} />
                                <StaticCalculationRow label={t('ertragsplan.retained_earnings')} values={monthly[yearIndex].map((m) => m.profitAfterTax - m.privateWithdrawals)} visibleMonths={visibleMonths} sum={sum} isBold />
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };
    
    return (
        <div className="card">
            {tooltip && <div className="product-description-tooltip visible" style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}>{tooltip.content}</div>}
            
            {addModalState && (
                <AddModal 
                    onCancel={() => setAddModalState(null)} 
                    onAdd={handleAddSubItem}
                    planningYears={planningYears}
                />
            )}
            
            {editingState && (
                <EditModal 
                    subItem={editingState.subItem}
                    onCancel={() => setEditingState(null)}
                    onSave={(data) => handleSaveSubItem(editingState.categoryKey, editingState.subItem.id, data)}
                    onDelete={() => {
                        setEditingState(null);
                        setDeleteConfirmState({ categoryKey: editingState.categoryKey, subItemId: editingState.subItem.id, subItemName: editingState.subItem.name });
                    }}
                    planningYears={planningYears}
                />
            )}
            
            {deleteConfirmState && (
                <DeleteConfirmModal
                    subItemName={deleteConfirmState.subItemName}
                    onConfirm={handleDeleteSubItem}
                    onCancel={() => setDeleteConfirmState(null)}
                />
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

            <h2>{t('ertragsplan.title')}</h2>
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
                            title={t('ertragsplan.reset_year_title', { year: activeYear + 1 })}
                            aria-label={t('ertragsplan.reset_year_title', { year: activeYear + 1 })}
                        >
                           <Icon icon="trash" size={16} />
                        </button>
                    </div>
                    {[...Array(planningYears).keys()].map(year => (
                        <div key={year} className={`tab ${safeYear === year ? 'active' : ''}`} onClick={() => setActiveYear(year)}>
                            <span className="tab-label">{t('ertragsplan.fiscal_year_tab', { index: year + 1, year: foundationYear + year })}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="tab-content">
                {renderYearTable(safeYear)}
            </div>
        </div>
    );
});
