/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomAiPrompt } from '../../types.ts';
import { Icon } from '../Icon.tsx';

interface AiChatInputProps {
    isLoading: boolean;
    onSendMessage: (e: React.FormEvent, message: string) => void;
    onCancelRequest: () => void;
    uploadedFile: { name: string } | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: () => void;
    isIngesting: boolean;
    forcedTools: Set<string>;
    onForcedToolsChange: (tools: Set<string>) => void;
    isChatUnsaved: boolean;
    isChatSaved: boolean;
    onSaveChat: () => void;
    customAiPrompts: CustomAiPrompt[];
}

export const AiChatInput = ({
    isLoading, onSendMessage, onCancelRequest, uploadedFile, onFileChange, onRemoveFile, isIngesting,
    forcedTools, onForcedToolsChange,
    isChatUnsaved, isChatSaved, onSaveChat,
    customAiPrompts
}: AiChatInputProps) => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isResizingTextarea, setIsResizingTextarea] = useState(false);
    const [manualHeight, setManualHeight] = useState<number | null>(null);
    const textareaResizeStartY = useRef(0);
    const textareaInitialHeight = useRef(0);
    const [isPromptSelectorOpen, setIsPromptSelectorOpen] = useState(false);

    const toggleTool = (toolId: string) => {
        const newTools = new Set(forcedTools);
        if (newTools.has(toolId)) {
            newTools.delete(toolId);
        } else {
            newTools.add(toolId);
        }
        onForcedToolsChange(newTools);
    };

    const isToolForced = (toolId: string) => forcedTools.has(toolId);

    const availablePrompts = useMemo(() => {
        return customAiPrompts || [];
    }, [customAiPrompts]);

    useEffect(() => {
        if (input === '') {
            setManualHeight(null);
        }
    }, [input]);

    useEffect(() => {
        if (textareaRef.current && !isResizingTextarea && manualHeight === null) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [input, isResizingTextarea, manualHeight]);

    const handleTextareaResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        textareaResizeStartY.current = e.clientY;
        if(textareaRef.current) textareaInitialHeight.current = textareaRef.current.offsetHeight;
        document.body.classList.add('dragging');
        setIsResizingTextarea(true);
    };

    useEffect(() => {
        if (!isResizingTextarea) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dy = e.clientY - textareaResizeStartY.current;
            const newHeight = textareaInitialHeight.current + dy;
            const clampedHeight = Math.max(38, Math.min(newHeight, 500)); // Increased max height
            if (textareaRef.current) {
                textareaRef.current.style.height = `${clampedHeight}px`;
                setManualHeight(clampedHeight);
            }
        };

        const handleMouseUp = () => {
            document.body.classList.remove('dragging');
            setIsResizingTextarea(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('dragging');
        };
    }, [isResizingTextarea]);
    
    const handleSubmit = (e: React.FormEvent) => {
        onSendMessage(e, input);
        setInput('');
    };

    const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const promptText = e.target.value;
        if (promptText) {
            setInput(promptText);
        }
        setIsPromptSelectorOpen(false);
        e.target.value = "";
    };

    return (
        <div className="ai-chat-input-container">
            {uploadedFile && (
                <div className="ai-attached-file">
                    <Icon icon="file" size={16} />
                    <span>{uploadedFile.name}</span>
                    <button onClick={onRemoveFile}>×</button>
                </div>
            )}
            <div className="ai-chat-options">
                <div className="ai-chat-option-group">
                    <button
                        type="button"
                        className={`ai-icon-toggle-btn ${isToolForced('web_search') ? 'active' : ''}`}
                        onClick={() => toggleTool('web_search')}
                        title={isToolForced('web_search') ? t('ai_assistant.input.web_search_tooltip.forced') : t('ai_assistant.input.web_search_tooltip.auto')}
                    >
                        <Icon icon="globe" size={20} />
                    </button>
                    <button
                        type="button"
                        className={`ai-icon-toggle-btn ${isToolForced('local_knowledge') ? 'active' : ''}`}
                        onClick={() => toggleTool('local_knowledge')}
                        title={isToolForced('local_knowledge') ? t('ai_assistant.input.local_knowledge_tooltip.forced') : t('ai_assistant.input.local_knowledge_tooltip.auto')}
                    >
                        <Icon icon="book" size={20} />
                    </button>
                </div>
                <div className="ai-chat-option-group">
                    <button
                        className={isChatUnsaved ? "btn-primary" : "btn-secondary"}
                        onClick={onSaveChat}
                        disabled={isLoading || !isChatUnsaved}
                        title={isChatUnsaved ? t('ai_assistant.input.save_tooltip.unsaved') : (isChatSaved ? t('ai_assistant.input.save_tooltip.saved') : t('ai_assistant.input.save_tooltip.empty'))}
                    >
                        <Icon icon="save" size={20} />
                    </button>
                </div>
            </div>
            <div className="ai-chat-input-wrapper-with-prompts">
                {isPromptSelectorOpen && (
                    <div className="ai-prompt-selector-expanded">
                         <select onChange={handlePromptSelect} onBlur={() => setIsPromptSelectorOpen(false)} autoFocus>
                            <option value="">{t('ai_assistant.input.prompts_placeholder')}</option>
                            {availablePrompts.map(p => <option key={p.id} value={p.prompt}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                <form className="ai-chat-input-form" onSubmit={handleSubmit}>
                     <button
                        type="button"
                        className="ai-prompt-toggle-btn"
                        onClick={() => setIsPromptSelectorOpen(prev => !prev)}
                        disabled={!availablePrompts || availablePrompts.length === 0}
                        title={t('ai_assistant.input.prompts_tooltip')}
                        aria-label={t('ai_assistant.input.prompts_tooltip')}
                    >
                         <Icon icon="star" size={20} />
                    </button>
                    <button type="button" className={`btn-attach ${isIngesting ? 'loading' : ''}`} onClick={() => !isIngesting && fileInputRef.current?.click()} title={t('ai_assistant.input.attach_tooltip')}>
                        {isIngesting ? <span className="ai-thinking-spinner inline"></span> : <Icon icon="attach" size={20} />}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={onFileChange} accept="application/pdf,.txt,.docx,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} />
                    <div className="ai-chat-textarea-wrapper">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={t('ai_assistant.input.placeholder')}
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e as unknown as React.FormEvent);
                                }
                            }}
                        />
                        <div className="ai-chat-textarea-resize-handle" onMouseDown={handleTextareaResizeMouseDown} title={t('ai_assistant.input.resize_tooltip')}>
                            <Icon icon="corner-resize" size={14} />
                        </div>
                    </div>
                    {isLoading ? (
                        <button type="button" onClick={onCancelRequest} title={t('ai_assistant.input.stop_tooltip')}>
                            <Icon icon="stop" size={20} />
                        </button>
                    ) : (
                        <button type="submit" disabled={isLoading || !input.trim()} title={t('ai_assistant.input.send_tooltip')}>
                            <Icon icon="send" size={20} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};