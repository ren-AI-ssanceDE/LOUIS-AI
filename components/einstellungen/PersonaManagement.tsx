/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiPersona } from '../../types.ts';

interface PersonaEditorModalProps {
    editingPersona: AiPersona | 'new';
    onSave: (data: { name: string, prompt: string }) => void;
    onClose: () => void;
    showErrorModal: (error: { title: string; message: string }) => void;
}

export const PersonaEditorModal = memo(({ editingPersona, onSave, onClose, showErrorModal }: PersonaEditorModalProps) => {
    const { t } = useTranslation();
    const isNew = editingPersona === 'new';
    
    const getInitialData = () => isNew 
        ? { name: '', prompt: '' } 
        : { name: editingPersona.name, prompt: editingPersona.prompt };

    const [formData, setFormData] = useState(getInitialData());

    useEffect(() => {
        setFormData(getInitialData());
    }, [editingPersona]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handleSaveClick = () => {
        if (!formData.name.trim() || !formData.prompt.trim()) {
            showErrorModal({
                title: t('settings.ai_persona.editor.validation_error_title'),
                message: t('settings.ai_persona.editor.validation_error_message')
            });
            return;
        }
        onSave(formData);
    }

    return (
         <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content persona-editor-modal" onClick={e => e.stopPropagation()}>
                <h2>{isNew ? t('settings.ai_persona.editor.title_new') : t('settings.ai_persona.editor.title_edit')}</h2>
                <div className="form-group">
                    <label>{t('settings.ai_persona.editor.name_label')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} autoFocus />
                </div>
                <div className="form-group">
                    <label>{t('settings.ai_persona.editor.prompt_label')}</label>
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

export const DeletePersonaConfirmModal = memo(({ personaName, onConfirm, onCancel }: { personaName: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('settings.ai_persona.delete_modal.title')}</h2>
                <p>{t('settings.ai_persona.delete_modal.confirm_text', { name: personaName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
});
