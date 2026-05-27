/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedChat, ChatMessage } from '../../types.ts';
import { Icon } from '../Icon.tsx';

interface AiAssistantHeaderProps {
    savedChats: SavedChat[];
    selectedChatId: string;
    onSelectedChatIdChange: (id: string) => void;
    onLoadChat: () => void;
    onResetChat: () => void;
    onClose: () => void;
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
    chatHistory: ChatMessage[];
    isLoading: boolean;
    onRefreshMemory: () => void;
}

export const AiAssistantHeader = ({
    savedChats, selectedChatId, onSelectedChatIdChange, onLoadChat, onResetChat, onClose, onMouseDown,
    chatHistory, isLoading, onRefreshMemory
}: AiAssistantHeaderProps) => {
    const { t } = useTranslation();
    return (
    <header className="ai-assistant-header" onMouseDown={onMouseDown}>
        <div className="ai-header-title-group">
            <Icon icon="grip-vertical" size={14} className="ai-drag-handle" />
            <div className="flex items-center gap-2">
                <h3>{t('ai_assistant.header.title')}</h3>
                <span className="ai-badge-agentic">
                    Agentic v2.0
                </span>
            </div>
            <div className="ai-header-load-controls">
                <select
                    className="ai-saved-chat-selector"
                    value={selectedChatId}
                    onChange={e => onSelectedChatIdChange(e.target.value)}
                    disabled={savedChats.length === 0}
                >
                    <option value="" disabled>{t('ai_assistant.header.load_placeholder')}</option>
                    {savedChats.map(chat => (
                        <option key={chat.id} value={chat.id}>{chat.name}</option>
                    ))}
                </select>
                <button
                    className="btn-icon btn-load-chat"
                    onClick={onLoadChat}
                    disabled={!selectedChatId}
                    title={t('ai_assistant.header.load_tooltip')}
                >
                    <Icon icon="load" size={16} />
                </button>
            </div>
        </div>
         <div className="ai-header-controls">
            <button onClick={onRefreshMemory} className="btn-icon" title={t('ai_assistant.header.refresh_tooltip')} aria-label={t('ai_assistant.header.refresh_tooltip')} disabled={chatHistory.length < 3 || isLoading}>
                <Icon icon="brain" size={16} />
            </button>
            <button onClick={onResetChat} className="btn-icon" title={t('ai_assistant.header.reset_tooltip')} aria-label={t('ai_assistant.header.reset_tooltip')} disabled={chatHistory.length === 0 || isLoading}>
                <Icon icon="reset" size={16} />
            </button>
            <button onClick={onClose} className="btn-icon" aria-label={t('common.close')}>
                <Icon icon="close" size={20} />
            </button>
        </div>
    </header>
    );
};
