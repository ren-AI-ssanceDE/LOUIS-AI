/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiAssistant } from '../hooks/useAiAssistant.ts';
import { useWindowDragResize } from '../hooks/useWindowDragResize.ts';
import { AiAssistantHeader } from './ai/AiAssistantHeader.tsx';
import { AiChatBody } from './ai/AiChatBody.tsx';
import { AiChatInput } from './ai/AiChatInput.tsx';
import { AiDataReview } from './ai/AiDataReview.tsx';
import type { FinancialData, AiSettings, AppState, AiPersona, CalculationResults, ViewType } from '../types.ts';
import { Icon } from './Icon.tsx';

type AiAssistantProps = {
    projectData: FinancialData;
    calculations: CalculationResults | null;
    aiSettings: AiSettings;
    onDataChange: (data: Partial<FinancialData>) => void;
    appState: AppState;
    personas: AiPersona[];
    handleNewProject: () => void;
    handleNewProjectFromData: (data: FinancialData) => void;
    view: ViewType;
};

export const AiAssistant = (props: AiAssistantProps) => {
    const { t } = useTranslation();
    const { 
        projectData, appState, handleNewProject, view
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const initialWidth = Math.min(window.innerWidth - 40, 500);
    const initialHeight = Math.min(window.innerHeight - 100, 700);

    const {
        windowRef,
        dimensions,
        interaction,
        handleDragMouseDown,
        handleResizeMouseDown
    } = useWindowDragResize(initialWidth, initialHeight);

    const {
        chatHistory,
        isLoading,
        uploadedFile,
        forcedTools,
        isIngesting,
        selectedChatId,
        isChatSaved,
        reviewProposal,
        savedChats,
        setForcedTools,
        setUploadedFile,
        setSelectedChatId,
        setReviewProposal,
        handleSendMessage,
        handleContinueChat,
        handleQuickActionClick,
        handleKbChoice,
        handleFileChange,
        handleSaveChat,
        handleLoadChat,
        handleResetChat,
        handleCancelRequest,
        handleMessageFeedback,
        handleManualMemoryRefresh,
        handleConfirmReview,
        handleCancelChanges,
        handleExportTrainingData
    } = useAiAssistant(props);

    const onConfirmAction = (action: 'CREATE_NEW_PROJECT', data?: FinancialData) => {
        if (action === 'CREATE_NEW_PROJECT') {
            if (data) {
                setReviewProposal({ origin: projectData, proposed: data, isNewProject: true });
            } else {
                handleNewProject();
            }
        }
    };

    const handleFileChangeWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handleFileChange(file);
        if (e.target) e.target.value = '';
    };

    const confirmReset = () => {
        handleResetChat();
        setShowResetConfirm(false);
    };

    const isAiDisabled = false;
    const windowStyle: React.CSSProperties = { 
        top: `${dimensions.y}px`, 
        left: `${dimensions.x}px`, 
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px`,
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        zIndex: 1000
    };

    return (
        <>
            <div className="ai-assistant-container">
                 <div className="tooltip-wrapper" data-tooltip={isAiDisabled ? t('ai_assistant.disabled_tooltip') : t('ai_assistant.toggle_tooltip')}>
                    <button 
                        className={`ai-assistant-toggle ${isOpen ? 'open' : ''} ${isAiDisabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (!isAiDisabled) {
                                setIsOpen(!isOpen);
                            }
                        }} 
                        disabled={isAiDisabled} 
                        aria-label={t('ai_assistant.toggle_tooltip')}
                    >
                        {t('ai_assistant.toggle_label')}
                    </button>
                </div>
                <div ref={windowRef} className={`ai-assistant-window ${isOpen ? 'open' : ''} ${interaction ? 'is-interacting' : ''}`} style={windowStyle}>
                    <div className="resize-handle" onMouseDown={handleResizeMouseDown} title={t('ai_assistant.input.resize_tooltip')}>
                        <Icon icon="corner-resize" size={14} style={{ transform: 'rotate(180deg)' }} />
                    </div>
                    <AiAssistantHeader
                        savedChats={savedChats}
                        selectedChatId={selectedChatId}
                        onSelectedChatIdChange={setSelectedChatId}
                        onLoadChat={() => handleLoadChat(selectedChatId)}
                        onResetChat={() => setShowResetConfirm(true)}
                        onClose={() => setIsOpen(false)}
                        onMouseDown={handleDragMouseDown}
                        chatHistory={chatHistory}
                        isLoading={isLoading}
                        onRefreshMemory={handleManualMemoryRefresh}
                    />
                    <AiChatBody
                        chatHistory={chatHistory}
                        onConfirmChanges={(p) => setReviewProposal({ origin: projectData, proposed: p })}
                        onCancelChanges={handleCancelChanges}
                        onQuickActionClick={handleQuickActionClick}
                        onContinueChat={handleContinueChat}
                        onConfirmAction={onConfirmAction}
                        onMessageFeedback={handleMessageFeedback}
                        onExportTrainingData={handleExportTrainingData}
                        onKbChoice={handleKbChoice}
                        currentView={view}
                        isLoading={isLoading}
                    />
                    <AiChatInput
                        isLoading={isLoading}
                        onSendMessage={handleSendMessage}
                        onCancelRequest={handleCancelRequest}
                        uploadedFile={uploadedFile}
                        onFileChange={handleFileChangeWrapper}
                        onRemoveFile={() => setUploadedFile(null)}
                        isIngesting={isIngesting}
                        forcedTools={forcedTools}
                        onForcedToolsChange={setForcedTools}
                        isChatUnsaved={chatHistory.length > 0 && !isChatSaved}
                        isChatSaved={isChatSaved}
                        onSaveChat={handleSaveChat}
                        customAiPrompts={appState.customAiPrompts || []}
                    />
                </div>
            </div>
            {reviewProposal && (
                <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setReviewProposal(null)}>
                    <div className="modal-content review-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%' }}>
                        <AiDataReview 
                            key={`review-${JSON.stringify(reviewProposal.proposed).substring(0, 50)}-${Date.now()}`}
                            originalData={reviewProposal.origin}
                            proposedData={reviewProposal.proposed}
                            onConfirm={(data) => handleConfirmReview(data, reviewProposal.isNewProject)}
                            onCancel={() => setReviewProposal(null)}
                        />
                    </div>
                </div>
            )}
            {showResetConfirm && (
                <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{t('app.reset_chat_confirm_title')}</h2>
                        <p>{t('app.reset_chat_confirm_text')}</p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowResetConfirm(false)}>{t('app.cancel')}</button>
                            <button className="btn-danger" onClick={confirmReset}>{t('app.reset')}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
