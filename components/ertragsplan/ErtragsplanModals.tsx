/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { OpCostSubItem } from '../../types.ts';

interface YearSelectorProps {
    planningYears: number;
    selectedYears: number[];
    onChange: (years: number[]) => void;
}

const YearSelector = ({ planningYears, selectedYears, onChange }: YearSelectorProps) => {
    const { t } = useTranslation();
    const handleYearToggle = (yearIndex: number) => {
        const newSelected = new Set(selectedYears);
        if (newSelected.has(yearIndex)) {
            newSelected.delete(yearIndex);
        } else {
            newSelected.add(yearIndex);
        }
        onChange(Array.from(newSelected).sort((a, b) => a - b));
    };

    return (
        <div className="year-selector">
            <label>{t('modals.subitem.active_in_years')}</label>
            <div className="year-checkbox-group">
                {[...Array(planningYears).keys()].map(yearIndex => (
                    <label key={yearIndex} className="checkbox-label small">
                        <input
                            type="checkbox"
                            checked={selectedYears.includes(yearIndex)}
                            onChange={() => handleYearToggle(yearIndex)}
                        />
                        <span>{t('common.year')} {yearIndex + 1}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export const AddModal = memo(({ onAdd, onCancel, planningYears }: { onAdd: (name: string, desc: string, activeInYears: number[]) => void, onCancel: () => void, planningYears: number }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedYears, setSelectedYears] = useState<number[]>(() => [...Array(planningYears).keys()]);

    const handleAdd = () => {
        if (!name.trim()) {
            alert(t('modals.subitem.alert_name_required'));
            return;
        }
        onAdd(name, description, selectedYears);
    };
    
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('modals.subitem.title_new')}</h2>
                <div className="form-group">
                    <label>{t('modals.subitem.label_name')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('modals.subitem.placeholder_name')} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('modals.subitem.label_description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('modals.subitem.placeholder_description')} />
                </div>
                <YearSelector planningYears={planningYears} selectedYears={selectedYears} onChange={setSelectedYears} />
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={handleAdd}>{t('common.add')}</button>
                </div>
            </div>
        </div>
    );
});

export const EditModal = memo(({ subItem, onSave, onCancel, onDelete, planningYears }: { subItem: OpCostSubItem, onSave: (data: { name: string, description: string, activeInYears: number[] }) => void, onCancel: () => void, onDelete: () => void, planningYears: number }) => {
    const { t } = useTranslation();
    const [name, setName] = useState(subItem.name);
    const [description, setDescription] = useState(subItem.description || '');
    const [selectedYears, setSelectedYears] = useState<number[]>(subItem.activeInYears ?? [...Array(planningYears).keys()]);

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('modals.subitem.title_edit')}</h2>
                <div className="form-group">
                    <label>{t('common.name')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('common.description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: '100px', resize: 'vertical' }} />
                </div>
                <YearSelector planningYears={planningYears} selectedYears={selectedYears} onChange={setSelectedYears} />
                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                     <button className="btn-danger" onClick={onDelete}>{t('common.delete')}</button>
                    <div className="modal-action-group">
                        <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                        <button className="btn-primary" onClick={() => onSave({ name, description, activeInYears: selectedYears })}>{t('common.save')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export const DeleteConfirmModal = memo(({ subItemName, onConfirm, onCancel }: { subItemName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('modals.subitem.delete_title')}</h2>
                <p>{t('modals.subitem.delete_confirm', { name: subItemName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('modals.subitem.delete_confirm_button')}</button>
                </div>
            </div>
        </div>
    );
});

export const ResetConfirmModal = memo(({ yearIndex, onConfirm, onCancel }: { yearIndex: number, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('modals.subitem.reset_title')}</h2>
                <p>{t('modals.subitem.reset_confirm', { year: yearIndex + 1 })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.reset')}</button>
                </div>
            </div>
        </div>
    );
});
