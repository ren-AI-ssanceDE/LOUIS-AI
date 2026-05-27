/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Icon } from '../Icon.tsx';
import type { AiSettings, EmailTemplate } from '../../types.ts';

interface EmailTemplatesCardProps {
    aiSettings: AiSettings;
    setAiSettings: (settings: AiSettings) => void;
    setNotification: (notification: { message: string; id: number } | null) => void;
    showErrorModal: (error: { title: string; message: string }) => void;
}

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image'],
        ['clean']
    ],
};

const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
];

export const EmailTemplatesCard = memo(({ aiSettings, setAiSettings, setNotification, showErrorModal }: EmailTemplatesCardProps) => {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', subject: '', body: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const templates = aiSettings.templates || [];

    const handleSave = () => {
        if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) return;

        let newTemplates: EmailTemplate[];
        if (editingId) {
            newTemplates = templates.map(t => t.id === editingId ? { ...t, ...formData } : t);
        } else {
            const newTemplate: EmailTemplate = {
                id: `tmpl_${uuidv4()}`,
                name: formData.name,
                subject: formData.subject,
                body: formData.body,
                createdAt: new Date().toISOString()
            };
            newTemplates = [...templates, newTemplate];
        }

        setAiSettings({ ...aiSettings, templates: newTemplates });
        resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', subject: '', body: '' });
    };

    const handleEdit = (tmpl: EmailTemplate) => {
        setEditingId(tmpl.id);
        setFormData({ name: tmpl.name, subject: tmpl.subject, body: tmpl.body });
        setIsAdding(true);
    };

    const handleDelete = (id: string) => {
        const newTemplates = templates.filter(t => t.id !== id);
        setAiSettings({ ...aiSettings, templates: newTemplates });
    };

    const handleExport = () => {
        if (templates.length === 0) return;
        const dataStr = JSON.stringify(templates, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.download = `email_templates_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    const validTemplates = imported.filter(t => t && t.name && t.subject && t.body);
                    if (validTemplates.length > 0) {
                        setAiSettings({ ...aiSettings, templates: [...templates, ...validTemplates] });
                        setNotification({ message: t('settings.templates.import_success'), id: Date.now() });
                    } else {
                        throw new Error(t('settings.templates.invalid_format'));
                    }
                } else {
                    throw new Error(t('settings.templates.invalid_format'));
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                showErrorModal({
                    title: t('settings.templates.import_failed'),
                    message: msg
                });
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    return (
        <div className="card">
            <div className="card-header-with-actions">
                <h2>{t('settings.templates.title')}</h2>
                <div className="header-actions">
                    <button className="btn-icon-primary" onClick={() => setIsAdding(true)} title={t('settings.templates.add_new')} disabled={isAdding}>
                        <Icon icon="plus" size={18} strokeWidth={2.5} />
                    </button>
                    <button className="btn-icon-primary" onClick={handleExport} title={t('settings.templates.export')} disabled={templates.length === 0}>
                        <Icon icon="folderDownload" size={18} />
                    </button>
                    <button className="btn-icon-primary" onClick={handleImportClick} title={t('settings.templates.import')}>
                        <Icon icon="upload" size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
                </div>
            </div>
            
            <div className="settings-section">
                <p className="help-text" style={{margin: '0 0 1rem 0'}}>{t('settings.templates.hint')}</p>

                <div className="signatures-list">
                    {templates.map(tmpl => (
                        <div key={tmpl.id} className="signature-item">
                            <div className="sig-info">
                                <span className="sig-name">{tmpl.name}</span>
                            </div>
                            <div className="sig-actions">
                                <button className="btn-icon-primary" onClick={() => handleEdit(tmpl)} title={t('common.edit')}>
                                    <Icon icon="edit" size={16} />
                                </button>
                                <button className="btn-icon-danger" onClick={() => handleDelete(tmpl.id)} title={t('common.delete')}>
                                    <Icon icon="trash" size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {templates.length === 0 && !isAdding && (
                        <div className="empty-message">{t('settings.templates.no_templates')}</div>
                    )}
                </div>

                {isAdding && (
                <div className="signature-editor">
                    <h3>{editingId ? t('settings.templates.edit_title') : t('settings.templates.add_title')}</h3>
                        <div className="form-group">
                            <label>{t('settings.templates.label_name')}</label>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                placeholder={t('settings.templates.placeholder_name')}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('settings.templates.label_subject')}</label>
                            <input 
                                type="text" 
                                value={formData.subject} 
                                onChange={e => setFormData({ ...formData, subject: e.target.value })} 
                                placeholder={t('settings.templates.placeholder_subject')}
                            />
                        </div>
                        <div className="form-group quill-editor-wrapper">
                            <label>{t('settings.templates.label_body')}</label>
                            <ReactQuill 
                                theme="snow"
                                value={formData.body}
                                onChange={content => setFormData({ ...formData, body: content })}
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder={t('settings.templates.placeholder_body')}
                                className="html-editor"
                            />
                        </div>
                    <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleSave} disabled={!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()}>
                            {t('common.save')}
                        </button>
                        <button className="btn btn-secondary" onClick={resetForm}>
                            {t('common.cancel')}
                        </button>
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
});
