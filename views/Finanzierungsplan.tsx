/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancingItem, StartupCosts, CompanySettings } from '../types.ts';
import { FinancingItemModal, DeleteFinancingConfirmModal } from '../components/finanzierungsplan/FinanzierungsplanModals.tsx';
import { FinancingTable, StartupCostsTable } from '../components/finanzierungsplan/FinanzierungsplanTables.tsx';
import { useFinanzierungsplan } from '../hooks/useFinanzierungsplan.ts';

interface FinanzierungsplanProps {
    data: FinancingItem[];
    setData: (d: FinancingItem[]) => void;
    startupCosts: StartupCosts;
    setStartupCosts: (d: StartupCosts) => void;
    settings: CompanySettings;
}

export const Finanzierungsplan = memo(({ data, setData, startupCosts, setStartupCosts, settings }: FinanzierungsplanProps) => {
    const { t } = useTranslation();
    const {
        deleteConfirm, setDeleteConfirm,
        modalState, setModalState,
        tooltip,
        handleItemHover,
        handleItemMouseLeave,
        updateItem,
        handleSaveItem,
        handleStartupCostChange,
        handleConfirmDelete
    } = useFinanzierungsplan({ data, setData, startupCosts, setStartupCosts, settings });

    return (
        <div className="card">
            {tooltip && (
                <div
                    className="product-description-tooltip visible"
                    style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
                >
                    {tooltip.content}
                </div>
            )}
            {modalState && (
                <FinancingItemModal 
                    item={modalState.item}
                    onClose={() => setModalState(null)}
                    onSave={handleSaveItem}
                    onDeleteRequest={(item) => {
                        setModalState(null);
                        setDeleteConfirm(item);
                    }}
                />
            )}
            {deleteConfirm && (
                <DeleteFinancingConfirmModal 
                    item={deleteConfirm}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
            <h2>{t('finanzierungsplan.title')}</h2>
            <div className="finanzierungsplan-top-grid">
                <div>
                    <FinancingTable 
                        type="equity"
                        data={data}
                        onUpdateItem={updateItem}
                        onAddItem={(type) => setModalState({ mode: 'add', type })}
                        onEditItem={(item) => setModalState({ mode: 'edit', item })}
                        onHover={handleItemHover}
                        onMouseLeave={handleItemMouseLeave}
                    />
                </div>
                <div>
                    <h3>{t('finanzierungsplan.startup_costs')}</h3>
                    <StartupCostsTable 
                        startupCosts={startupCosts}
                        onStartupCostChange={handleStartupCostChange}
                    />
                </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
                <FinancingTable 
                    type="debt"
                    data={data}
                    onUpdateItem={updateItem}
                    onAddItem={(type) => setModalState({ mode: 'add', type })}
                    onEditItem={(item) => setModalState({ mode: 'edit', item })}
                    onHover={handleItemHover}
                    onMouseLeave={handleItemMouseLeave}
                />
            </div>
        </div>
    );
});
