/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedChat } from '../../types.ts';

export const DeleteChatConfirmModal = memo(({ 
    type, 
    chatId, 
    savedChats, 
    onConfirm, 
    onCancel 
}: { 
    type: 'single' | 'all', 
    chatId?: string, 
    savedChats: SavedChat[], 
    onConfirm: () => void, 
    onCancel: () => void 
}) => {
    const { t } = useTranslation();
    const isSingle = type === 'single';
    const chatNameToDelete = isSingle ? savedChats.find(c => c.id === chatId)?.name : '';
    
    const title = isSingle 
        ? t('modals.delete_chat.title') + ` "${chatNameToDelete}"` 
        : t('modals.delete_chat.title') + '?';
    
    const message = isSingle 
        ? t('modals.delete_chat.confirm')
        : t('modals.delete_chat.confirm_all');

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{title}</h2>
                <p>{message}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={onConfirm}>{t('modals.delete_chat.confirm_button')}</button>
                </div>
            </div>
        </div>
    );
});

export const ImportChatConfirmModal = memo(({ 
    importConfirm, 
    onConfirm, 
    onCancel 
}: { 
    importConfirm: { newChats: SavedChat[]; chatsToOverwrite: { existing: SavedChat; new: SavedChat }[] }, 
    onConfirm: () => void, 
    onCancel: () => void 
}) => {
    const { t } = useTranslation();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{t('modals.import_chat.title')}</h2>
                <p>{t('modals.import_chat.overwrite_msg')}</p>
                <ul>
                    {importConfirm.chatsToOverwrite.map(item => <li key={item.existing.id}>{item.existing.name}</li>)}
                </ul>
                {importConfirm.newChats.length > 0 && (
                    <p>{t('modals.import_chat.new_chats_msg', { count: importConfirm.newChats.length })}</p>
                )}
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={onConfirm}>{t('modals.import_chat.confirm_button')}</button>
                </div>
            </div>
        </div>
    );
});
