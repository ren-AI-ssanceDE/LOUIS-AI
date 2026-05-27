/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon.tsx';
import type { CustomAiPrompt } from '../../types.ts';

interface AiPromptCardProps {
    setEditingPrompt: (prompt: CustomAiPrompt | 'new') => void;
    customAiPrompts: CustomAiPrompt[];
    selectedPromptId: string | null;
    setSelectedPromptId: (id: string) => void;
    handleExportPrompt: (prompt: CustomAiPrompt) => void;
    setDeletePromptConfirm: (prompt: CustomAiPrompt) => void;
    promptImportRef: React.RefObject<HTMLInputElement>;
    handlePromptFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectablePrompts: CustomAiPrompt[];
}

export const AiPromptCard = memo(({
    setEditingPrompt, customAiPrompts, selectedPromptId, setSelectedPromptId,
    handleExportPrompt, setDeletePromptConfirm,
    promptImportRef, handlePromptFileChange, selectablePrompts
}: AiPromptCardProps) => {
    const { t } = useTranslation();

    return (
        <div className="card">
            <h2>{t('settings.ai_prompt.title')}</h2>
            <div className="settings-section">
                <h3>{t('settings.ai_prompt.manage_title')}</h3>
                <p className="help-text">{t('settings.ai_prompt.manage_hint')}</p>
                <div className="form-group" style={{marginTop: '1rem'}}>
                    <div className="persona-selection-controls">
                        <button
                            className="btn-icon-primary"
                            onClick={() => setEditingPrompt('new')}
                            disabled={(customAiPrompts || []).filter(p => !p.id.startsWith('prompt_default_')).length >= 25}
                            title={t('settings.ai_prompt.new_tooltip')}
                        >
                            <Icon icon="plus" size={18} strokeWidth={2.5} />
                        </button>
                        <select
                            value={selectedPromptId || ''}
                            onChange={e => setSelectedPromptId(e.target.value)}
                            aria-label={t('settings.ai_prompt.title')}
                        >
                            {selectablePrompts.filter(p => p.id.startsWith('prompt_default_')).length > 0 && (
                                <optgroup label={t('settings.ai_prompt.premade_prompts')}>
                                    {selectablePrompts.filter(p => p.id.startsWith('prompt_default_')).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            )}
                            {selectablePrompts.filter(p => !p.id.startsWith('prompt_default_')).length > 0 && (
                                <optgroup label={t('settings.ai_prompt.own_prompts')}>
                                    {selectablePrompts.filter(p => !p.id.startsWith('prompt_default_')).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            )}
                        </select>
                        <button
                            className="btn-icon-square"
                            onClick={() => {
                                if (!selectedPromptId) return;
                                const promptToEdit = selectablePrompts.find(p => p.id === selectedPromptId);
                                if(promptToEdit) setEditingPrompt(promptToEdit);
                            }}
                            title={t('settings.ai_prompt.edit_tooltip')}
                        >
                            <Icon icon="edit" size={16} />
                        </button>
                        <button
                            className="btn-icon-square"
                            onClick={() => {
                                if (!selectedPromptId) return;
                                const promptToExp = selectablePrompts.find(p => p.id === selectedPromptId);
                                if(promptToExp) handleExportPrompt(promptToExp);
                            }}
                            title={t('settings.ai_prompt.export_tooltip')}
                        >
                            <Icon icon="load" size={16} />
                        </button>
                        <button
                            className="btn-icon-danger"
                            onClick={() => {
                                if (!selectedPromptId) return;
                                const promptToDel = selectablePrompts.find(p => p.id === selectedPromptId);
                                if (promptToDel) setDeletePromptConfirm(promptToDel);
                            }}
                            title={t('settings.ai_prompt.delete_tooltip')}
                        >
                            <Icon icon="trash" size={16} />
                        </button>
                    </div>
                    <div className="persona-management-actions" style={{ marginTop: '0.75rem' }}>
                        <button
                            className="btn-icon-primary"
                            onClick={() => promptImportRef.current?.click()}
                            disabled={(customAiPrompts || []).filter(p => !p.id.startsWith('prompt_default_')).length >= 25}
                            title={t('settings.ai_prompt.import_tooltip')}
                        >
                            <Icon icon="upload" size={16} />
                        </button>
                        <input type="file" ref={promptImportRef} onChange={handlePromptFileChange} style={{display: 'none'}} accept=".json" />
                    </div>
                </div>
            </div>
        </div>
    );
});
