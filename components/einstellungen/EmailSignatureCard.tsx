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
import type { AiSettings, EmailSignature } from '../../types.ts';

interface EmailSignatureCardProps {
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

export const EmailSignatureCard = memo(({ aiSettings, setAiSettings, setNotification, showErrorModal }: EmailSignatureCardProps) => {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', content: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const signatures = aiSettings.signatures || [];

    const handleSave = () => {
        if (!formData.name.trim() || !formData.content.trim()) return;

        let newSignatures: EmailSignature[];
        if (editingId) {
            newSignatures = signatures.map(s => s.id === editingId ? { ...s, ...formData } : s);
        } else {
            const newSignature: EmailSignature = {
                id: `sig_${uuidv4()}`,
                name: formData.name,
                content: formData.content,
                createdAt: new Date().toISOString()
            };
            newSignatures = [...signatures, newSignature];
        }

        setAiSettings({ ...aiSettings, signatures: newSignatures });
        resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', content: '' });
    };

    const handleEdit = (sig: EmailSignature) => {
        setEditingId(sig.id);
        setFormData({ name: sig.name, content: sig.content });
        setIsAdding(true);
    };

    const handleDelete = (id: string) => {
        const newSignatures = signatures.filter(s => s.id !== id);
        setAiSettings({ ...aiSettings, signatures: newSignatures });
    };

    const handleExport = () => {
        if (signatures.length === 0) return;
        const dataStr = JSON.stringify(signatures, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.download = `signatures_backup_${new Date().toISOString().split('T')[0]}.json`;
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
                    // Basic validation
                    const validSignatures = imported.filter(s => s && s.name && s.content);
                    if (validSignatures.length > 0) {
                        setAiSettings({ ...aiSettings, signatures: [...signatures, ...validSignatures] });
                        setNotification({ message: t('settings.signatures.import_success'), id: Date.now() });
                    } else {
                        throw new Error(t('settings.signatures.invalid_format'));
                    }
                } else {
                    throw new Error(t('settings.signatures.invalid_format'));
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                showErrorModal({
                    title: t('settings.signatures.import_failed'),
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
                <h2>{t('settings.signatures.title')}</h2>
                <div className="header-actions">
                    <button className="btn-icon-primary" onClick={() => setIsAdding(true)} title={t('settings.signatures.add_new')} disabled={isAdding}>
                        <Icon icon="plus" size={18} strokeWidth={2.5} />
                    </button>
                    <button className="btn-icon-primary" onClick={handleExport} title={t('settings.signatures.export')} disabled={signatures.length === 0}>
                        <Icon icon="folderDownload" size={18} />
                    </button>
                    <button className="btn-icon-primary" onClick={handleImportClick} title={t('settings.signatures.import')}>
                        <Icon icon="upload" size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
                </div>
            </div>
            
            <div className="settings-section">
                <p className="help-text" style={{margin: '0 0 1rem 0'}}>{t('settings.signatures.hint')}</p>

                <div className="signatures-list">
                    {signatures.map(sig => (
                        <div key={sig.id} className="signature-item">
                            <div className="sig-info">
                                <span className="sig-name">{sig.name}</span>
                            </div>
                            <div className="sig-actions">
                                <button className="btn-icon-primary" onClick={() => handleEdit(sig)} title={t('common.edit')}>
                                    <Icon icon="edit" size={16} />
                                </button>
                                <button className="btn-icon-danger" onClick={() => handleDelete(sig.id)} title={t('common.delete')}>
                                    <Icon icon="trash" size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {signatures.length === 0 && !isAdding && (
                        <div className="empty-message">{t('settings.signatures.no_signatures')}</div>
                    )}
                </div>

                {isAdding && (
                <div className="signature-editor">
                    <h3>{editingId ? t('settings.signatures.edit_title') : t('settings.signatures.add_title')}</h3>
                        <div className="form-group">
                            <label>{t('settings.signatures.label_name')}</label>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                placeholder={t('settings.signatures.placeholder_name')}
                            />
                        </div>
                        <div className="form-group quill-editor-wrapper">
                            <label>{t('settings.signatures.label_content')}</label>
                            <ReactQuill 
                                theme="snow"
                                value={formData.content}
                                onChange={content => setFormData({ ...formData, content })}
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder={t('settings.signatures.placeholder_content')}
                                className="html-editor"
                            />
                        </div>
                    <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleSave} disabled={!formData.name.trim() || !formData.content.trim()}>
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
