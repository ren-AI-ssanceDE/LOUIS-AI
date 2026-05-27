/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '../NumberInput.tsx';
import type { ProductCategory } from '../../types.ts';

interface CategoryModalProps {
    modalState: { mode: 'add' | 'edit', category?: ProductCategory };
    onClose: () => void;
    onSave: (mode: 'add' | 'edit', data: { name: string, description: string }, id?: string) => void;
    onDeleteRequest: (category: ProductCategory) => void;
}

export const CategoryModal = memo(({ modalState, onClose, onSave, onDeleteRequest }: CategoryModalProps) => {
    const { t } = useTranslation();
    const { mode, category } = modalState;
    const isNew = mode === 'add';
    const [name, setName] = useState(isNew ? '' : category!.name);
    const [description, setDescription] = useState(isNew ? '' : category!.description || '');

    const handleSave = () => {
        if (!name.trim()) {
            alert(t('product_calc.category_name_required') || 'Bitte geben Sie einen Namen für die Kategorie an.');
            return;
        }
        onSave(mode, { name, description }, category?.id);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{isNew ? t('product_calc.new_category') : t('product_calc.edit_category')}</h2>
                <div className="form-group">
                    <label>{t('common.category_name')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('product_calc.category_desc_label')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: '100px', resize: 'vertical' }} placeholder={t('product_calc.category_desc_placeholder')} />
                </div>
                <div className="modal-actions" style={{ justifyContent: !isNew ? 'space-between' : 'flex-end' }}>
                    {!isNew && (
                        <button className="btn-danger" onClick={() => onDeleteRequest(category!)}>{t('common.delete')}</button>
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

interface CategorySettingsModalProps {
    category: ProductCategory;
    onClose: () => void;
    onSave: (newSettings: Partial<ProductCategory>) => void;
}

export const CategorySettingsModal = memo(({ category, onClose, onSave }: CategorySettingsModalProps) => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState({
        cogsPercentage: category.cogsPercentage,
        revenueDelayWeeks: category.revenueDelayWeeks,
        reservePercentage: category.reservePercentage,
        reserveDelayWeeks: category.reserveDelayWeeks,
    });

    const handleChange = (field: keyof typeof settings, value: number) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const newSettings: Partial<ProductCategory> = {};
        const processSetting = (value: number | undefined): number | undefined => {
            if (value === undefined || isNaN(value)) {
                return undefined;
            }
            return value;
        };

        newSettings.cogsPercentage = processSetting(settings.cogsPercentage);
        newSettings.revenueDelayWeeks = processSetting(settings.revenueDelayWeeks);
        newSettings.reservePercentage = processSetting(settings.reservePercentage);
        newSettings.reserveDelayWeeks = processSetting(settings.reserveDelayWeeks);

        onSave(newSettings);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('product_calc.category_settings_title', { name: category.name })}</h2>
                <div className="form-group">
                    <label>{t('product_calc.cogs_label')}</label>
                    <NumberInput name="cogsPercentage" value={settings.cogsPercentage} onChange={val => handleChange('cogsPercentage', val)} min={0} />
                    <p className="help-text">{t('product_calc.cogs_hint')}</p>
                </div>
                <div className="form-group">
                    <label>{t('product_calc.revenue_delay_label')}</label>
                    <NumberInput name="revenueDelayWeeks" value={settings.revenueDelayWeeks} onChange={val => handleChange('revenueDelayWeeks', val)} min={0} />
                </div>
                 <div className="form-group">
                    <label>{t('product_calc.reserve_label')}</label>
                    <NumberInput name="reservePercentage" value={settings.reservePercentage} onChange={val => handleChange('reservePercentage', val)} min={0} />
                </div>
                 <div className="form-group">
                    <label>{t('product_calc.reserve_delay_label')}</label>
                    <NumberInput name="reserveDelayWeeks" value={settings.reserveDelayWeeks} onChange={val => handleChange('reserveDelayWeeks', val)} min={0} />
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={handleSave}>{t('common.save')}</button>
                </div>
            </div>
        </div>
    );
});

export const ProductDeleteConfirmModal = memo(({ productName, onConfirm, onCancel }: { productName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('product_calc.delete_unit_title')}</h2>
                <p>{t('product_calc.delete_unit_confirm', { name: productName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
});

export const CategoryDeleteConfirmModal = memo(({ categoryName, onConfirm, onCancel }: { categoryName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('product_calc.delete_category_title')}</h2>
                <p>{t('product_calc.delete_category_confirm', { name: categoryName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
});

export const CategoryUpdateConfirmModal = memo(({ categoryName, onConfirm, onCancel }: { categoryName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('product_calc.apply_settings_title')}</h2>
                <p>{t('product_calc.apply_settings_confirm', { name: categoryName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={onConfirm}>{t('common.ok')}</button>
                </div>
            </div>
        </div>
    );
});
