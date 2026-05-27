/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '../../components/Icon.tsx';
import { NumberInput } from '../../components/NumberInput.tsx';
import { BarChart } from '../../components/BarChart.tsx';
import { useStore } from '../../store/index.ts';
import { applyScenario } from '../../services/scenarioService.ts';
import { calculateFinancials } from '../../services/calculationService.ts';
import { formatCurrency } from '../../utils.ts';
import { CollapsibleSection } from '../../components/CollapsibleSection.tsx';
import type { FinancialData, Scenario, ScenarioAdjustment, OpCostCategoryKey, CalculationResults } from '../../types.ts';

interface SzenariovergleichProps {
    baseData: FinancialData;
    baseCalculations: CalculationResults;
    isStale: boolean;
}

type ComparisonResult = {
    id: string | 'base';
    name: string;
    calculations: CalculationResults;
};

type KpiKey = 'revenue' | 'grossProfit' | 'profitBeforeTax' | 'endBalance';

// --- MODAL FOR SCENARIO CREATION/EDITING ---
const ScenarioModal = memo(({
    scenario,
    onClose,
    onSave,
    onDeleteRequest,
    baseData
}: {
    scenario: Scenario | 'new';
    onClose: () => void;
    onSave: (scenario: Scenario) => void;
    onDeleteRequest: (scenario: Scenario) => void;
    baseData: FinancialData;
}) => {
    const { t } = useTranslation();

    const costCategoryLabels: Record<OpCostCategoryKey, string> = {
        managementSalary: t('operational_costs.ceo_salaries'), 
        personnelCosts: t('operational_costs.personnel'), 
        rentAndFacilities: t('operational_costs.facility_costs'),
        officeSupplies: t('operational_costs.office_costs'), 
        vehicleExpenses: t('operational_costs.vehicle_costs'), 
        advertisingCosts: t('operational_costs.advertising_costs'),
        insuranceAndFees: t('operational_costs.insurance'), 
        consultingCosts: t('operational_costs.consulting_costs'), 
        travelExpenses: t('operational_costs.travel_costs'),
        otherOperatingExpenses: t('operational_costs.other_expenses'),
    };

    const isNew = scenario === 'new';
    const [name, setName] = useState(isNew ? '' : scenario.name);
    const [description, setDescription] = useState(isNew ? '' : scenario.description);
    const [adjustments, setAdjustments] = useState<ScenarioAdjustment[]>(isNew ? [] : scenario.adjustments);

    const handleAddAdjustment = () => {
        const newAdjustment: ScenarioAdjustment = {
            id: uuidv4(),
            target: 'salesForecast',
            targetId: 'all',
            changeValue: 10,
            startYear: 0,
            endYear: baseData.settings.planningYears - 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setAdjustments([...adjustments, newAdjustment]);
    };

    const handleUpdateAdjustment = (id: string, field: keyof ScenarioAdjustment, value: ScenarioAdjustment[keyof ScenarioAdjustment]) => {
        setAdjustments(adjustments.map(adj => {
            if (adj.id !== id) return adj;
            
            const newAdj = { ...adj, [field]: value, updatedAt: new Date().toISOString() };
    
            // If the target type changes, reset the specific targetId to 'all'
            // to prevent invalid combinations (e.g., target='sales' with targetId='raumkosten').
            if (field === 'target') {
                newAdj.targetId = 'all';
            }
    
            return newAdj;
        }));
    };
    
    const handleRemoveAdjustment = (id: string) => {
        setAdjustments(adjustments.filter(adj => adj.id !== id));
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert(t('scenarios.validation.name_required'));
            return;
        }
        if (name.length > 20) {
            alert(t('scenarios.validation.name_too_long'));
            return;
        }
        const finalScenario: Scenario = {
            id: isNew ? uuidv4() : scenario.id,
            name,
            description,
            adjustments,
            createdAt: isNew ? new Date().toISOString() : scenario.createdAt,
            updatedAt: new Date().toISOString()
        };
        onSave(finalScenario);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content scenario-modal" onClick={e => e.stopPropagation()}>
                <h2>{isNew ? t('scenarios.modal.title_new') : t('scenarios.modal.title_edit')}</h2>
                <div className="form-group">
                    <label>{t('scenarios.modal.name_label')}</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        maxLength={20}
                        autoFocus 
                    />
                    <div className="char-counter">{name.length} / 20</div>
                </div>
                <div className="form-group">
                    <label>{t('scenarios.modal.description_label')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('scenarios.modal.description_placeholder')} />
                </div>
                <h3>{t('scenarios.modal.adjustments')}</h3>
                <div className="scenario-adjustments-list">
                    {adjustments.length === 0 && <p className="help-text">{t('scenarios.modal.adjustments_empty')}</p>}
                    {adjustments.map(adj => (
                        <div key={adj.id} className="scenario-adjustment-item">
                            <div className="adjustment-main-row">
                                <div className="adjustment-row">
                                    <label>{t('scenarios.modal.type')}</label>
                                    <select value={adj.target} onChange={e => handleUpdateAdjustment(adj.id, 'target', e.target.value)}>
                                        <option value="salesForecast">{t('scenarios.targets.salesForecast')}</option>
                                        <option value="operationalCosts">{t('scenarios.targets.operationalCosts')}</option>
                                    </select>
                                </div>
                                <div className="adjustment-row">
                                    <label>{t('scenarios.modal.target')}</label>
                                    {adj.target === 'salesForecast' && (
                                        <select value={String(adj.targetId)} onChange={e => handleUpdateAdjustment(adj.id, 'targetId', e.target.value)}>
                                            <option value="all">{t('scenarios.targets.all_products')}</option>
                                            {baseData.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    )}
                                    {adj.target === 'operationalCosts' && (
                                        <select value={String(adj.targetId)} onChange={e => handleUpdateAdjustment(adj.id, 'targetId', e.target.value)}>
                                            <option value="all">{t('scenarios.targets.all_costs')}</option>
                                            {(Object.keys(costCategoryLabels) as OpCostCategoryKey[]).map(key => <option key={key} value={key}>{costCategoryLabels[key]}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="adjustment-row">
                                    <label>{t('scenarios.modal.change')}</label>
                                    <div className="input-with-suffix">
                                        <NumberInput value={adj.changeValue} onChange={val => handleUpdateAdjustment(adj.id, 'changeValue', val)} />
                                        <span>%</span>
                                    </div>
                                </div>
                                <button className="btn-icon-danger" onClick={() => handleRemoveAdjustment(adj.id)}><Icon icon="trash" size={16}/></button>
                            </div>
                            <div className="adjustment-row">
                                <label>{t('scenarios.modal.period')}</label>
                                <div className="year-range-selector">
                                    <span>{t('scenarios.modal.from_fy')}</span>
                                    <select value={adj.startYear} onChange={e => handleUpdateAdjustment(adj.id, 'startYear', Number(e.target.value))}>
                                        {[...Array(baseData.settings.planningYears).keys()].map(y => <option key={y} value={y}>{y + 1}</option>)}
                                    </select>
                                    <span>{t('scenarios.modal.to_fy')}</span>
                                    <select value={adj.endYear} onChange={e => handleUpdateAdjustment(adj.id, 'endYear', Number(e.target.value))}>
                                        {[...Array(baseData.settings.planningYears).keys()].map(y => <option key={y} value={y}>{y + 1}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="btn-icon-primary" onClick={handleAddAdjustment} style={{ marginTop: '0.5rem' }} title={t('scenarios.modal.add_adjustment')}>
                    <Icon icon="plus" size={18} strokeWidth="2.5" />
                </button>

                <div className="modal-actions" style={{ justifyContent: isNew ? 'flex-end' : 'space-between' }}>
                    {!isNew && (
                        <button className="btn-danger" onClick={() => onDeleteRequest(scenario as Scenario)}>{t('common.delete')}</button>
                    )}
                    <div className="modal-action-group">
                        <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
                        <button className="btn-primary" onClick={handleSave}>{t('common.save')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
export const Szenariovergleich = memo(({ baseData, baseCalculations, isStale }: SzenariovergleichProps) => {
    const { t } = useTranslation();
    const updateCurrentProjectData = useStore(state => state.updateCurrentProjectData);

    const [modalState, setModalState] = useState<Scenario | 'new' | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Scenario | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string | 'base'>>(() => new Set(['base']));
    const [selectedKpi, setSelectedKpi] = useState<KpiKey>('profitBeforeTax');
    const [selectedScenarioId, setSelectedScenarioId] = useState<string | ''>('');

    const scenarios = baseData.scenarios || [];

    const handleSaveScenario = (scenario: Scenario) => {
        const existing = scenarios.find(s => s.id === scenario.id);
        let updatedScenarios;
        if (existing) {
            updatedScenarios = scenarios.map(s => s.id === scenario.id ? scenario : s);
        } else {
            updatedScenarios = [...scenarios, scenario];
            setSelectedScenarioId(scenario.id);
        }
        updateCurrentProjectData({ scenarios: updatedScenarios });
        setModalState(null);
    };

    const handleDeleteScenario = () => {
        if (!deleteConfirm) return;
        const updatedScenarios = scenarios.filter(s => s.id !== deleteConfirm.id);
        updateCurrentProjectData({ scenarios: updatedScenarios });
        
        if (selectedScenarioId === deleteConfirm.id) {
            setSelectedScenarioId('');
        }
        
        const newSelectedIds = new Set(selectedIds);
        newSelectedIds.delete(deleteConfirm.id);
        setSelectedIds(newSelectedIds);
        
        setDeleteConfirm(null);
    };
    
    const handleSelectionChange = (id: string | 'base') => {
        const newSelectedIds = new Set(selectedIds);
        const isDisabled = !newSelectedIds.has(id) && newSelectedIds.size >= 3;
        
        if (isDisabled) return;

        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const comparisonResults: ComparisonResult[] = useMemo(() => {
        const results: ComparisonResult[] = [];
        if (selectedIds.has('base')) {
            results.push({ id: 'base', name: t('scenarios.current_project'), calculations: baseCalculations });
        }
        scenarios.forEach(s => {
            if (selectedIds.has(s.id)) {
                const modifiedData = applyScenario(baseData, s);
                const scenarioCalculations = calculateFinancials(modifiedData);
                if (scenarioCalculations) {
                    results.push({ id: s.id, name: s.name, calculations: scenarioCalculations });
                }
            }
        });
        return results;
    }, [selectedIds, scenarios, baseData, baseCalculations, t]);

    const kpiOptions: { key: KpiKey; label: string }[] = [
        { key: 'revenue', label: t('ertragsplan.revenue') },
        { key: 'grossProfit', label: t('ertragsplan.gross_profit') },
        { key: 'profitBeforeTax', label: t('uebersicht.profit_bt_short') },
        { key: 'endBalance', label: t('stats.foerdergeber.kpis.liquidity_end') },
    ];
    
    const selectedKpiLabel = kpiOptions.find(k => k.key === selectedKpi)?.label || '';

    return (
         <>
            {modalState && <ScenarioModal 
                scenario={modalState} 
                onClose={() => setModalState(null)} 
                onSave={handleSaveScenario} 
                baseData={baseData} 
                onDeleteRequest={(scenarioToDelete) => {
                    setModalState(null);
                    setDeleteConfirm(scenarioToDelete);
                }}
            />}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{t('scenarios.delete.title')}</h2>
                        <p>{t('scenarios.delete.confirm', { name: deleteConfirm.name })}</p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
                            <button className="btn-danger" onClick={handleDeleteScenario}>{t('common.delete')}</button>
                        </div>
                    </div>
                </div>
            )}
            <CollapsibleSection title={t('scenarios.title')}>
                <div className="statistik-container">
                    <div className="szenario-top-controls">
                        <div className="szenario-management-column">
                            <h4>{t('scenarios.manage')}</h4>
                            <div className="form-group">
                                <div className="scenario-selection-controls">
                                    <select
                                        value={selectedScenarioId}
                                        onChange={(e) => setSelectedScenarioId(e.target.value)}
                                        aria-label={t('scenarios.select_scenario')}
                                    >
                                        <option value="">{t('scenarios.select_scenario')}</option>
                                        {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button
                                        className="btn-icon-square"
                                        onClick={() => {
                                            const scenarioToEdit = scenarios.find(s => s.id === selectedScenarioId);
                                            if (scenarioToEdit) {
                                                setModalState(scenarioToEdit);
                                            }
                                        }}
                                        disabled={!selectedScenarioId}
                                        title={t('scenarios.edit_scenario')}
                                    >
                                        <Icon icon="edit" size={16} />
                                    </button>
                                        <button
                                            className="btn-icon-primary"
                                            onClick={() => setModalState('new')}
                                            title={t('scenarios.create_scenario')}
                                        >
                                            <Icon icon="plus" size={18} strokeWidth="2.5" />
                                        </button>
                                </div>
                            </div>
                        </div>
                        <div className="szenario-controls">
                             <div className="form-group">
                                <label>{t('scenarios.select_comparison')}</label>
                                <div className="scenario-selection-buttons">
                                    <button
                                        className={selectedIds.has('base') ? 'active' : ''}
                                        onClick={() => handleSelectionChange('base')}
                                        disabled={!selectedIds.has('base') && selectedIds.size >= 3}
                                        type="button"
                                    >
                                        {t('scenarios.current_project')}
                                    </button>
                                    {scenarios.map(s => (
                                        <button
                                            key={s.id}
                                            className={selectedIds.has(s.id) ? 'active' : ''}
                                            onClick={() => handleSelectionChange(s.id)}
                                            disabled={!selectedIds.has(s.id) && selectedIds.size >= 3}
                                            type="button"
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('scenarios.select_kpi')}</label>
                                <select value={selectedKpi} onChange={e => setSelectedKpi(e.target.value as KpiKey)}>
                                    {kpiOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="szenario-results-grid">
                        <div className="chart-wrapper">
                            {comparisonResults.length > 0 && (
                                         <BarChart
                                    title={t('scenarios.annual_comparison', { kpi: selectedKpiLabel })}
                                    labels={[...Array(baseData.settings.planningYears).keys()].map(y => t('stats.fiscal_year_short', { index: y + 1 }))}
                                    datasets={comparisonResults.map((r, i) => ({
                                        label: r.name,
                                        values: (r.calculations?.yearly || []).map((y) => y ? y[selectedKpi] : 0),
                                        type: (['bar1', 'bar2', 'bar3', 'primary', 'secondary'] as const)[i % 5]
                                    }))}
                                    isStale={isStale}
                                    width={550}
                                    height={338}
                                />
                            )}
                        </div>
                        <div className="scenario-comparison-block">
                           <h4>{t('scenarios.comparison_title', { kpi: selectedKpiLabel })}</h4>
                           {comparisonResults.length > 0 ? (
                                <div className="table-container">
                                   <table className="gewinn-table">
                                       <thead>
                                           <tr>
                                               <th>{t('scenarios.fiscal_year')}</th>
                                               {comparisonResults.map(r => <th key={r.id} className="calculated-cell">{r.name}</th>)}
                                           </tr>
                                       </thead>
                                       <tbody>
                                           {[...Array(baseData.settings.planningYears).keys()].map(yearIndex => (
                                               <tr key={yearIndex}>
                                                   <td>{t('scenarios.year_index', { index: yearIndex + 1 })}</td>
                                                   {comparisonResults.map(r => (
                                                       <td key={r.id} className="calculated-cell">
                                                           {formatCurrency(((r.calculations?.yearly || [])[yearIndex] || {})[selectedKpi] || 0)}
                                                       </td>
                                                   ))}
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                                </div>
                           ) : (
                                <p className="help-text" style={{marginTop: '1rem'}}>{t('scenarios.empty_selection')}</p>
                           )}
                       </div>
                    </div>
                </div>
            </CollapsibleSection>
        </>
    );
});