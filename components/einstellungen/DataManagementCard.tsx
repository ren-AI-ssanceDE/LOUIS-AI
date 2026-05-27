/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon.tsx';
import { KbManager, KbManagerHandle } from './KnowledgeBaseManagement.tsx';
import type { SaveHistoryEntry, SavedChat, AppState } from '../../types.ts';

interface DataManagementCardProps {
    saveHistory: SaveHistoryEntry[];
    onRestore: (entry: SaveHistoryEntry) => void;
    savedChats: SavedChat[];
    handleExportChat: (id: string) => void;
    handleDeleteChat: (id: string) => void;
    chatImportRef: React.RefObject<HTMLInputElement>;
    handleChatFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleExportAllChats: () => void;
    handleDeleteAllChats: () => void;
    onExportAll: () => void;
    onExportSingle: () => void;
    projectImportRef: React.RefObject<HTMLInputElement>;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    appState: AppState;
    setNotification: (n: { message: string, id: number } | null) => void;
}

export const DataManagementCard = memo(({
    saveHistory, onRestore, savedChats, handleExportChat, handleDeleteChat,
    chatImportRef, handleChatFileChange, handleExportAllChats, handleDeleteAllChats,
    onExportAll, onExportSingle, projectImportRef, onImport,
    appState, setNotification
}: DataManagementCardProps) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language === 'de' ? 'de-DE' : 'en-US';
    const kbRef = useRef<KbManagerHandle>(null);

    return (
        <div className="card">
            <h2>{t('data_management.title')}</h2>
            <div className="settings-section">
                <h3>{t('data_management.restore_title')}</h3>
                <p className="help-text">{t('data_management.restore_hint')}</p>
                <div style={{ marginTop: '1rem' }}>
                    {saveHistory.length > 0 ? (
                        <ul className="restore-points-list">
                            {saveHistory.map((entry) => (
                                <li key={entry.timestamp} className="restore-point-item">
                                    <div className="restore-point-info">
                                        <span className="restore-point-date">{new Date(entry.timestamp).toLocaleString(currentLang)}</span>
                                        <span className="restore-point-project">
                                            {t('data_management.restore_point_project')} {entry.appStateSnapshot.projects.find(p => p.id === entry.appStateSnapshot.activeProjectId)?.projectName || t('data_management.restore_point_unknown')}
                                        </span>
                                    </div>
                                    <div className="tooltip-wrapper" data-tooltip={t('data_management.restore_stand_tooltip')}>
                                        <button className="btn-icon-square" onClick={() => onRestore(entry)}>
                                            <Icon icon="reset" size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>{t('data_management.no_restore_points')}</p>
                    )}
                </div>
            </div>
            <div className="settings-section">
                <h3>{t('data_management.manage_chats_title')}</h3>
                <p className="help-text">{t('data_management.manage_chats_hint')}</p>
                <div style={{ marginTop: '1rem' }}>
                    {savedChats.length > 0 ? (
                        <ul className="saved-chats-list">
                            {savedChats.map((chat) => (
                                <li key={chat.id} className="saved-chat-item">
                                    <div className="saved-chat-item-info">
                                        <span>{chat.name}</span>
                                        <span className="help-text">{t('data_management.chat_saved_at')} {new Date(chat.timestamp).toLocaleString(currentLang)}</span>
                                    </div>
                                    <div className="modal-action-group">
                                        <button className="btn-icon-square" onClick={() => handleExportChat(chat.id)} title={t('data_management.export_chat_tooltip')}>
                                            <Icon icon="load" size={16} />
                                        </button>
                                        <button className="btn-icon-danger" onClick={() => handleDeleteChat(chat.id)} title={t('data_management.delete_chat_tooltip')}>
                                            <Icon icon="trash" size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>{t('data_management.no_saved_chats')}</p>
                    )}
                    <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div className="tooltip-wrapper" data-tooltip={t('data_management.import_chats_tooltip')}>
                            <button className="btn-icon-primary" onClick={() => chatImportRef.current?.click()}>
                                <Icon icon="upload" size={16} />
                            </button>
                            <input type="file" ref={chatImportRef} onChange={handleChatFileChange} style={{display: 'none'}} accept=".json" />
                        </div>
                        <div className="tooltip-wrapper" data-tooltip={t('data_management.export_all_chats_tooltip')}>
                            <button className="btn-icon-square" onClick={handleExportAllChats} disabled={savedChats.length === 0}>
                                <Icon icon="folderDownload" size={16} />
                            </button>
                        </div>
                        <div className="tooltip-wrapper" data-tooltip={t('data_management.delete_all_chats_tooltip')}>
                            <button className="btn-icon-danger" onClick={handleDeleteAllChats} disabled={savedChats.length === 0}>
                                <Icon icon="trash" size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="settings-section">
                <h3>{t('data_management.export_import_title')}</h3>
                <p className="help-text">{t('data_management.export_import_hint')}</p>
                <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: '1rem', gap: '0.75rem' }}>
                    <div className="tooltip-wrapper" data-tooltip={t('data_management.export_all_projects_tooltip')}>
                        <button className="btn-icon-square" onClick={onExportAll}>
                            <Icon icon="folderDownload" size={16} />
                        </button>
                    </div>
                    <div className="tooltip-wrapper" data-tooltip={t('data_management.export_current_project_tooltip')}>
                        <button className="btn-icon-square" onClick={onExportSingle}>
                            <Icon icon="load" size={16} />
                        </button>
                    </div>
                    <div className="tooltip-wrapper" data-tooltip={t('data_management.import_project_tooltip')}>
                        <button className="btn-icon-primary" onClick={() => projectImportRef.current?.click()}>
                            <Icon icon="upload" size={16} />
                        </button>
                        <input type="file" ref={projectImportRef} accept=".json" onChange={onImport} style={{ display: 'none' }} />
                    </div>
                </div>
            </div>
            <div className="settings-section">
                <div className="card-header-with-actions" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{t('data_management.local_kb_title')}</h3>
                    <div className="tooltip-wrapper" data-tooltip="Neues Dokument hochladen">
                        <button className="btn-icon-primary" onClick={() => kbRef.current?.triggerUpload()}>
                            <Icon icon="plus" size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
                <p className="help-text">{t('data_management.local_kb_hint')}</p>
                <KbManager ref={kbRef} appState={appState} setNotification={setNotification} />
            </div>
        </div>
    );
});
