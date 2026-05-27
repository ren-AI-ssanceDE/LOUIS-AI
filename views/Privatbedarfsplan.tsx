/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils.ts';
import { MONTHS } from '../constants.ts';
import { Icon } from '../components/Icon.tsx';
import type { PrivateNeed, CompanySettings } from '../types.ts';
import { 
    AddModal, 
    EditModal, 
    DeleteConfirmModal, 
    ResetConfirmModal 
} from '../components/privatbedarfsplan/PrivatbedarfsplanModals.tsx';
import { ApplyToYearsModal } from '../components/ApplyToYearsModal.tsx';
import { 
    PrivateNeedSubItemRow, 
    PrivateNeedCategoryRow 
} from '../components/privatbedarfsplan/PrivatbedarfsplanRows.tsx';
import { usePrivatbedarfsplan } from '../hooks/usePrivatbedarfsplan.ts';

interface PrivatbedarfsplanProps {
    privateNeeds: PrivateNeed[];
    onPrivateNeedsChange: (newData: PrivateNeed[]) => void;
    settings: CompanySettings;
}

export const Privatbedarfsplan = memo(({ privateNeeds, onPrivateNeedsChange, settings }: PrivatbedarfsplanProps) => {
    const { t } = useTranslation();
    const planningYears = settings.planningYears || 3;
    const [activeYear, setActiveYear] = useState(0);
    
    const foundationYear = parseInt(settings.foundationDate.substring(0, 4), 10);
    const foundationMonth = parseInt(settings.foundationDate.substring(5, 7), 10) - 1;

    const {
        addModalState, setAddModalState,
        editingState, setEditingState,
        deleteConfirmState, setDeleteConfirmState,
        resetConfirm, setResetConfirm,
        applyToYearsConfirm, setApplyToYearsConfirm,
        tooltip,
        performResetYear,
        performApplyToYears,
        handleDirectCostChange,
        handleSubItemCostChange,
        handleFillForwardDirect,
        handleFillForwardSubItem,
        handleToggleExpand,
        handleAddSubItem,
        handleSaveSubItem,
        handleDeleteSubItem,
        handleItemHover,
        handleItemHoverEnd
    } = usePrivatbedarfsplan({ privateNeeds, onPrivateNeedsChange, planningYears });

    const renderYearTable = (year: number) => {
        const visibleMonths = Array.from({ length: 12 }, (_, i) => i).filter(m => !(year === 0 && m < foundationMonth));
        const isShortYear = year === 0 && visibleMonths.length < 12;
        
        const monthlyTotals = Array(12).fill(0);
        privateNeeds.forEach(need => {
            const useSubItems = need.subItems && need.subItems.length > 0;
            for (let m = 0; m < 12; m++) {
                let monthValue = 0;
                if (useSubItems) {
                    monthValue = need.subItems
                        .filter(subItem => subItem.activeInYears === undefined || subItem.activeInYears.includes(year))
                        .reduce((sum, item) => sum + (item.costs[year]?.[m] || 0), 0);
                } else {
                    monthValue = need.directCosts[year]?.[m] || 0;
                }
                monthlyTotals[m] += monthValue;
            }
        });

        const grandTotal = visibleMonths.reduce((sum, monthIndex) => sum + monthlyTotals[monthIndex], 0);

        return (
            <div className={`table-container ${isShortYear ? 'table-container-fit-content' : ''}`}>
                <table>
                    <thead className="sticky-header">
                        <tr>
                            <th className="sticky-col"><div className="row-header">{t('privatbedarfsplan.category')}</div></th>
                            {visibleMonths.map(m => <th key={m}>{t(`common.months.${m}`, { defaultValue: MONTHS[m] })}</th>)}
                            <th className="total-col">{t('privatbedarfsplan.total')} {foundationYear + year}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {privateNeeds.map(need => (
                            <Fragment key={need.id}>
                                <PrivateNeedCategoryRow
                                    need={need}
                                    year={year}
                                    visibleMonths={visibleMonths}
                                    onToggleExpand={handleToggleExpand}
                                    onDirectCostChange={handleDirectCostChange}
                                    onFillForward={handleFillForwardDirect}
                                />
                                {need.isExpanded && (
                                    <>
                                        {need.subItems
                                            .filter(subItem => subItem.activeInYears === undefined || subItem.activeInYears.includes(year))
                                            .map(subItem => (
                                            <PrivateNeedSubItemRow
                                                key={subItem.id}
                                                subItem={subItem}
                                                categoryId={need.id}
                                                year={year}
                                                visibleMonths={visibleMonths}
                                                onSubItemCostChange={handleSubItemCostChange}
                                                onFillForward={handleFillForwardSubItem}
                                                onEdit={(categoryId, subItem) => setEditingState({ categoryId, subItem })}
                                                onHover={handleItemHover}
                                                onHoverEnd={handleItemHoverEnd}
                                            />
                                        ))}
                                        <tr>
                                            <td className="sticky-col add-subitem-cell">
                                                <button className="btn-icon-primary" onClick={() => setAddModalState({ categoryId: need.id })} title={t('privatbedarfsplan.add_subitem')}>
                                                    <Icon icon="plus" size={18} strokeWidth="2.5" />
                                                </button>
                                            </td>
                                            <td colSpan={visibleMonths.length + 1}></td>
                                        </tr>
                                    </>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="total-row">
                            <td className="sticky-col"><div className="row-header">{t('privatbedarfsplan.grand_total')}</div></td>
                            {visibleMonths.map(month => (
                                <td key={month} className="input-cell disabled">
                                    <span>{formatCurrency(monthlyTotals[month])}</span>
                                </td>
                            ))}
                            <td className="total-col">
                                <span>{formatCurrency(grandTotal)}</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    return (
        <div className="card">
            {tooltip && <div className="product-description-tooltip visible" style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}>{tooltip.content}</div>}
            {addModalState && <AddModal onCancel={() => setAddModalState(null)} onAdd={handleAddSubItem} planningYears={planningYears} />}
            {editingState && (
                <EditModal 
                    subItem={editingState.subItem}
                    onCancel={() => setEditingState(null)}
                    onSave={(data) => handleSaveSubItem(editingState.categoryId, editingState.subItem.id, data)}
                    onDelete={() => {
                        setEditingState(null);
                        setDeleteConfirmState({ categoryId: editingState.categoryId, subItemId: editingState.subItem.id, subItemName: editingState.subItem.name });
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

            <h2>{t('privatbedarfsplan.title')}</h2>
            <div className="view-header-with-controls">
                <div className="tabs-container">
                    <div style={{ position: 'relative', zIndex: 1, marginRight: '1rem', display: 'flex', gap: '0.5rem' }}>
                         <button
                            className="btn-icon-primary"
                            onClick={() => setApplyToYearsConfirm(activeYear)}
                            title={t('common.apply_to_years_tooltip')}
                            aria-label={t('common.apply_to_years_tooltip')}
                        >
                            <Icon icon="copy" size={16} />
                        </button>
                         <button
                            className="btn-icon-danger"
                            onClick={() => setResetConfirm(activeYear)}
                            title={t('common.reset_year_tooltip', { year: activeYear + 1 })}
                            aria-label={t('common.reset_year_tooltip', { year: activeYear + 1 })}
                        >
                            <Icon icon="trash" size={16} />
                        </button>
                    </div>
                    {[...Array(planningYears).keys()].map(year => (
                        <div key={year} className={`tab ${activeYear === year ? 'active' : ''}`} onClick={() => setActiveYear(year)}>
                            <span className="tab-label">{t('privatbedarfsplan.fiscal_year', { index: year + 1, year: foundationYear + year })}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="tab-content">
                {renderYearTable(activeYear)}
            </div>
        </div>
    );
});
