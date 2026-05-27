/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomAiPrompt } from '../../types.ts';

interface PromptEditorModalProps {
    editingPrompt: CustomAiPrompt | 'new';
    onSave: (data: { name: string, description: string, prompt: string }) => void;
    onClose: () => void;
    showErrorModal: (error: { title: string; message: string }) => void;
}

export const PromptEditorModal = memo(({ editingPrompt, onSave, onClose, showErrorModal }: PromptEditorModalProps) => {
    const { t } = useTranslation();
    const isNew = editingPrompt === 'new';
    
    const getInitialData = () => isNew 
        ? { name: '', description: '', prompt: '' } 
        : { name: editingPrompt.name, description: editingPrompt.description, prompt: editingPrompt.prompt };

    const [formData, setFormData] = useState(getInitialData());

    useEffect(() => {
        setFormData(getInitialData());
    }, [editingPrompt]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handleSaveClick = () => {
        if (!formData.name.trim() || !formData.description.trim() || !formData.prompt.trim()) {
            showErrorModal({
                title: t('settings.ai_prompt.editor.validation_error_title'),
                message: t('settings.ai_prompt.editor.validation_error_message')
            });
            return;
        }
        onSave(formData);
    }

    return (
         <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content persona-editor-modal" onClick={e => e.stopPropagation()}>
                <h2>{isNew ? t('settings.ai_prompt.editor.title_new') : t('settings.ai_prompt.editor.title_edit')}</h2>
                <div className="form-group">
                    <label>{t('settings.ai_prompt.editor.name_label')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('settings.ai_prompt.editor.description_label')}</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>{t('settings.ai_prompt.editor.prompt_label')}</label>
                    <textarea name="prompt" value={formData.prompt} onChange={handleChange} />
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={handleSaveClick}>{t('common.save')}</button>
                </div>
            </div>
        </div>
    );
});

export const DeletePromptConfirmModal = memo(({ promptName, onConfirm, onCancel }: { promptName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('settings.ai_prompt.delete_modal.title')}</h2>
                <p>{t('settings.ai_prompt.delete_modal.confirm_text', { name: promptName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
});
