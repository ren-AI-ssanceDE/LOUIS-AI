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
import type { FinancingItem, StartupCosts } from '../../types.ts';

export interface FinancingTableProps {
    type: 'equity' | 'debt';
    data: FinancingItem[];
    onUpdateItem: (id: string, field: keyof FinancingItem, value: FinancingItem[keyof FinancingItem]) => void;
    onAddItem: (type: 'equity' | 'debt') => void;
    onEditItem: (item: FinancingItem) => void;
    onHover: (e: React.MouseEvent, description?: string) => void;
    onMouseLeave: () => void;
}

export const FinancingTable = memo(({ type, data, onUpdateItem, onAddItem, onEditItem, onHover, onMouseLeave }: FinancingTableProps) => {
    const { t } = useTranslation();
    const tableData = data.filter(item => item.type === type);
    const totalAmount = tableData.reduce((sum, item) => sum + item.amount, 0);

    return (
        <>
            <h3>{type === 'equity' ? t('finanzierungsplan.equity') : t('finanzierungsplan.debt')}</h3>
            <div className="table-container finanzierungsplan-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('finanzierungsplan.source')}</th>
                            <th>{t('finanzierungsplan.amount')}</th>
                            {type === 'debt' && (
                                <>
                                    <th>{t('finanzierungsplan.interest')}</th>
                                    <th>{t('finanzierungsplan.grace_period')}</th>
                                    <th>{t('finanzierungsplan.start_date')}</th>
                                    <th>{t('finanzierungsplan.end_date')}</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map(item => (
                            <tr key={item.id}>
                                <td className="input-cell">
                                    <div className="opcost-label-content">
                                        <button className="btn-icon-square" onClick={() => onEditItem(item)} title={t('common.edit')}>
                                            <Icon icon="edit" size={16} />
                                        </button>
                                        <div 
                                            className="row-header"
                                            onMouseMove={(e) => onHover(e, item.description)}
                                            onMouseLeave={onMouseLeave}
                                        >
                                           {item.source}
                                        </div>
                                    </div>
                                </td>
                                <td className="input-cell">
                                    <NumberInput value={item.amount} onChange={num => onUpdateItem(item.id, 'amount', num)} min={0} />
                                </td>
                                {type === 'debt' && (
                                    <>
                                        <td className="input-cell">
                                            <NumberInput value={item.interestRate} onChange={num => onUpdateItem(item.id, 'interestRate', num)} min={0} />
                                        </td>
                                        <td className="input-cell">
                                            <NumberInput value={item.graceMonths} onChange={num => onUpdateItem(item.id, 'graceMonths', Math.round(num))} min={0} />
                                        </td>
                                        <td className="input-cell">
                                            <input type="date" value={item.startDate || ''} onChange={e => onUpdateItem(item.id, 'startDate', e.target.value)} />
                                        </td>
                                        <td className="input-cell">
                                            <input type="date" value={item.endDate || ''} onChange={e => onUpdateItem(item.id, 'endDate', e.target.value)} />
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="add-item-row">
                            <td colSpan={type === 'debt' ? 6 : 2}>
                                <button className="btn-icon-primary" onClick={() => onAddItem(type)} title={t('common.add')}>
                                    <Icon icon="plus" size={18} strokeWidth="2.5" />
                                </button>
                            </td>
                        </tr>
                        {type === 'equity' && (
                             <tr className="total-row">
                                <td className="sticky-col"><div className="row-header">{t('finanzierungsplan.total_equity')}</div></td>
                                <td className="input-cell disabled"><span>{formatCurrency(totalAmount)}</span></td>
                            </tr>
                        )}
                        {type === 'debt' && (
                            <tr className="total-row">
                                <td className="sticky-col"><div className="row-header">{t('finanzierungsplan.total_debt')}</div></td>
                                <td className="input-cell disabled"><span>{formatCurrency(totalAmount)}</span></td>
                                <td colSpan={4}></td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>
        </>
    );
});

export interface StartupCostsTableProps {
    startupCosts: StartupCosts;
    onStartupCostChange: (field: keyof StartupCosts, value: number) => void;
}

export const StartupCostsTable = memo(({ startupCosts, onStartupCostChange }: StartupCostsTableProps) => {
    const { t } = useTranslation();
    const startupCostFields: { key: keyof StartupCosts; label: string }[] = [
        { key: 'inventoryMaterial', label: t('finanzierungsplan.startup_costs_items.inventory_material') },
        { key: 'rndOthers', label: t('finanzierungsplan.startup_costs_items.rnd_others') },
        { key: 'startupConsulting', label: t('finanzierungsplan.startup_costs_items.consulting') },
        { key: 'marketingTravel', label: t('finanzierungsplan.startup_costs_items.marketing_travel') },
        { key: 'registrationFees', label: t('finanzierungsplan.startup_costs_items.business_registration') },
        { key: 'initialCapital', label: t('finanzierungsplan.startup_costs_items.initial_capital') },
        { key: 'brokerDeposit', label: t('finanzierungsplan.startup_costs_items.broker_deposit') },
        { key: 'licensesAndOthers', label: t('finanzierungsplan.startup_costs_items.licenses_others') },
    ];
    
    const totalStartupCosts = Object.entries(startupCosts).reduce((sum, [_, val]) => typeof val === 'number' ? sum + val : sum, 0);

    return (
        <div className="table-container startup-costs-table">
            <table>
                <thead>
                    <tr>
                        <th>{t('finanzierungsplan.description')}</th>
                        <th>{t('finanzierungsplan.amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {startupCostFields.map(field => (
                        <tr key={field.key}>
                            <td>{field.label}</td>
                            <td className="input-cell">
                                <NumberInput 
                                    value={startupCosts[field.key] as number} 
                                    onChange={num => onStartupCostChange(field.key, num)} 
                                    min={0} 
                                />
                            </td>
                        </tr>
                    ))}
                    <tr className="total-row">
                        <td>{t('finanzierungsplan.total_startup_costs')}</td>
                        <td className="input-cell disabled"><span>{formatCurrency(totalStartupCosts)}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
});
