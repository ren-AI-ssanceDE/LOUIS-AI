/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../../types.ts';

interface AssetModalProps {
    item?: Asset;
    onClose: () => void;
    onSave: (data: { name: string, description: string }) => void;
    onDeleteRequest?: (item: Asset) => void;
}

export const AssetModal = memo(({ item, onClose, onSave, onDeleteRequest }: AssetModalProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState(item ? item.name : t('modals.asset.placeholder_name'));
    const [description, setDescription] = useState(item ? item.description || '' : '');

    const handleSave = () => {
        if (!name.trim()) {
            alert(t('modals.asset.alert_name_required'));
            return;
        }
        onSave({ name, description });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{item ? t('modals.asset.title_edit') : t('modals.asset.title_new')}</h2>
                <div className="form-group">
                    <label>{t('modals.asset.label_name')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('modals.asset.label_description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: '100px', resize: 'vertical' }} placeholder={t('modals.asset.placeholder_description')} />
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

export const DeleteAssetConfirmModal = memo(({ itemName, onConfirm, onCancel }: { itemName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('modals.asset.delete_title')}</h2>
                <p>{t('modals.asset.delete_confirm', { name: itemName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
});
