/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useEffect, useRef, memo, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon.tsx';
import { vectorService } from '../../services/vectorService.ts';
import type { AppState } from '../../types.ts';

export interface KbManagerHandle {
    triggerUpload: () => void;
    isLoading: boolean;
}

export const KbManager = memo(forwardRef<KbManagerHandle, { appState: AppState, setNotification: (n: { message: string, id: number } | null) => void }>(({ appState, setNotification }, ref) => {
    const { t } = useTranslation();
    const [docs, setDocs] = useState<{ title: string; timestamp: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        triggerUpload: () => {
            fileInputRef.current?.click();
        },
        isLoading
    }));

    const loadDocs = async () => {
        if (!appState.activeProjectId) return;
        setIsLoading(true);
        try {
            const data = await vectorService.getDocuments(appState.activeProjectId);
            setDocs(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDocs();
    }, [appState.activeProjectId]);

    const handleDelete = async (title: string) => {
        if (!confirm(`Möchten Sie "${title}" wirklich aus der Wissensdatenbank löschen?`)) return;
        try {
            await vectorService.deleteDocument(appState.activeProjectId || 'default', title);
            setNotification({ message: 'Dokument gelöscht', id: Date.now() });
            loadDocs();
        } catch (e) {
            alert("Fehler beim Löschen");
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        try {
            await vectorService.uploadFile(appState.activeProjectId || 'default', file);
            setNotification({ message: 'Dokument hinzugefügt', id: Date.now() });
            loadDocs();
        } catch (e) {
            alert("Upload fehlgeschlagen");
        } finally {
            setIsLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <div className="kb-list-container">
                {isLoading && docs.length === 0 ? (
                    <div className="spinner-small"></div>
                ) : docs.length > 0 ? (
                    <ul className="restore-points-list">
                        {docs.map(doc => (
                            <li key={doc.title} className="restore-point-item">
                                <div className="restore-point-info">
                                    <span className="restore-point-date" style={{ fontWeight: 600 }}>{doc.title}</span>
                                    {doc.timestamp && <span className="restore-point-project">Hinzugefügt: {new Date(doc.timestamp).toLocaleString('de-DE')}</span>}
                                </div>
                                <button className="btn-icon-danger" onClick={() => handleDelete(doc.title)}>
                                    <Icon icon="trash" size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="help-text">{t('ai_assistant.knowledge_base.empty')}</p>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="application/pdf,.txt,.docx,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} />
        </div>
    );
}));
