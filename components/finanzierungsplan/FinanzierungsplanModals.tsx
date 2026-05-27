/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancingItem } from '../../types.ts';

interface FinancingItemModalProps {
    item?: FinancingItem;
    onClose: () => void;
    onSave: (data: { source: string, description: string }) => void;
    onDeleteRequest?: (item: FinancingItem) => void;
}

export const FinancingItemModal = memo(({ item, onClose, onSave, onDeleteRequest }: FinancingItemModalProps) => {
    const { t } = useTranslation();
    const [source, setSource] = useState(item ? item.source : '');
    const [description, setDescription] = useState(item ? item.description || '' : '');

    const handleSave = () => {
        if (!source.trim()) {
            alert(t('finanzierung.source_name_required', { defaultValue: 'Bitte geben Sie einen Namen für die Quelle an.' }));
            return;
        }
        onSave({ source, description });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{item ? t('finanzierungsplan.edit_source') : t('finanzierungsplan.add_source')}</h2>
                <div className="form-group">
                    <label>{t('finanzierungsplan.source_name')}</label>
                    <input type="text" value={source} onChange={e => setSource(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('finanzierungsplan.source_description')}</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        style={{ minHeight: '100px', resize: 'vertical' }} 
                        placeholder={t('finanzierungsplan.source_description_placeholder')} 
                    />
                </div>
                <div className="modal-actions" style={{ justifyContent: item ? 'space-between' : 'flex-end' }}>
                    {item && onDeleteRequest && (
                        <button className="btn-danger" onClick={() => onDeleteRequest(item)}>{t('common.delete')}</button>
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

export const DeleteFinancingConfirmModal = memo(({ item, onConfirm, onCancel }: { item: FinancingItem, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('finanzierungsplan.delete_source')}</h2>
                <p>{t('finanzierungsplan.delete_source_confirm', { name: item.source })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
});
