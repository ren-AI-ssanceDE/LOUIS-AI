/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import type { ChatMessage, FinancialData, ViewType } from '../../types.ts';
import { AiChangeProposal } from './AiChangeProposal.tsx';
import { Icon } from '../Icon.tsx';

interface AiChatBodyProps {
    chatHistory: ChatMessage[];
    onConfirmChanges: (proposal: FinancialData) => void;
    onCancelChanges: (messageIndex: number) => void;
    onQuickActionClick: (prompt: string) => void;
    onContinueChat: () => void;
    onConfirmAction: (action: 'CREATE_NEW_PROJECT', data?: FinancialData) => void;
    onMessageFeedback: (index: number, feedback: 'positive' | 'negative', reason?: string) => void;
    onExportTrainingData: () => void;
    onKbChoice: (fileName: string, permanent: boolean) => void;
    currentView: ViewType;
    isLoading: boolean;
}

export const AiChatBody = ({ chatHistory, onConfirmChanges, onCancelChanges, onQuickActionClick, onContinueChat, onConfirmAction, onMessageFeedback, onExportTrainingData, onKbChoice, currentView, isLoading }: AiChatBodyProps) => {
    const { t, i18n } = useTranslation();
    const chatBodyRef = useRef<HTMLDivElement>(null);

    const lastHistoryLength = useRef(chatHistory.length);
    const lastMessageContent = useRef<string | undefined>(undefined);

    useEffect(() => {
        const hasNewMessage = chatHistory.length > lastHistoryLength.current;
        const lastMsg = chatHistory[chatHistory.length - 1];
        const contentChanged = lastMsg?.content !== lastMessageContent.current;
        
        // Scroll if a new message was added OR if content changed during loading (streaming/thinking)
        if (hasNewMessage || contentChanged || (contentChanged && !isLoading)) {
            // Use requestAnimationFrame to ensure DOM is updated before scrolling
            requestAnimationFrame(() => {
                chatBodyRef.current?.scrollTo({
                    top: chatBodyRef.current.scrollHeight,
                    behavior: hasNewMessage ? 'smooth' : 'auto'
                });
            });
        }
        
        lastHistoryLength.current = chatHistory.length;
        lastMessageContent.current = lastMsg?.content;
    }, [chatHistory, isLoading]);
    
    // Create a memoized, shuffled list of quick actions based on the current view.
    const quickActions = useMemo(() => {
        const getAction = (category: string, key: string) => ({
            label: t(`ai_assistant.quick_actions.${category}.${key}.label`),
            prompt: t(`ai_assistant.quick_actions.${category}.${key}.prompt`)
        });

        const generalKeys = ['investor_summary', 'swot', 'marketing', 'risks', 'profitability', 'cost_reduction'];
        const generalActions = generalKeys.map(k => getAction('general', k));

        const contextKeys: Record<string, string[]> = {
            grundeinstellungen: ['check_data', 'rename'],
            privatbedarf: ['analyze', 'inflation'],
            finanzierungsplan: ['equity_vs_debt', 'new_loan', 'check_funding'],
            abschreibungsplan: ['explain_afa', 'new_car'],
            produktPreiskalkulation: ['analyze_margins', 'increase_prices'],
            absatzplan: ['worst_case', 'top_product'],
            ertragsplan: ['top_costs', 'break_even'],
            liquiditaetsplan: ['bottlenecks', 'profit_vs_liquidity'],
            uebersicht: ['roi', 'payback'],
            einstellungen: ['persona', 'ai_modes']
        };

        const currentContextKeys = contextKeys[currentView] || [];
        const contextActions = currentContextKeys.map(k => getAction(currentView, k));
        
        const actionPool = [...generalActions, ...contextActions];
        
        // Remove duplicates just in case
        const uniqueActions = Array.from(new Set(actionPool.map(a => a.prompt)))
            .map(prompt => actionPool.find(a => a.prompt === prompt)!);

        return [...uniqueActions].sort(() => 0.5 - Math.random()).slice(0, 4);
    }, [chatHistory.length === 0, currentView, t]);

    return (
        <div className="ai-chat-body" ref={chatBodyRef}>
            {chatHistory.length === 0 && (
                <div className="ai-message model">
                    <div>
                        <p>{t('ai_assistant.body.welcome')}</p>
                        <ul>
                            <li>{t('ai_assistant.body.instruction_1')}</li>
                            <li>{t('ai_assistant.body.instruction_2')}</li>
                        </ul>
                    </div>
                     <div className="ai-quick-actions">
                        <h4>{t('ai_assistant.body.suggestions')}</h4>
                        {quickActions.map((action, i) => (
                            <button key={i} onClick={() => onQuickActionClick(action.prompt)} className="btn-secondary">
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {chatHistory.map((msg, index) => (
                msg.continueAction ? (
                    <div key={index} className="ai-continue-action">
                        <button className="btn-primary" onClick={onContinueChat}>
                            <Icon icon="play" size={16} />
                            {t('ai_assistant.body.continue')}
                        </button>
                    </div>
                ) : (
                    <div key={index} className={`ai-message ${msg.role}`}>
                        <div className="ai-message-content-wrapper">
                            {msg.thought && (
                                <details className="ai-thought-block group">
                                    <summary className="ai-thought-header">
                                        <Icon icon="sparkles" size={12} className="mr-2" />
                                        <span>{t('ai_assistant.body.thought_title')}</span>
                                        <div className="ml-auto flex items-center pr-1">
                                            <Icon icon="chevron-down" size={14} className="transition-transform duration-300 group-open:rotate-180 text-primary opacity-70 group-hover:opacity-100" />
                                        </div>
                                    </summary>
                                    <div className="ai-thought-content">
                                        {msg.thought.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                </details>
                            )}
                            <div className="markdown-content" dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(msg.content, { 
                                    ADD_ATTR: ['target', 'rel', 'class', 'src', 'alt', 'loading'],
                                    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote'] 
                                }) 
                            }} />
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="ai-sources">
                                    <h4>{t('ai_assistant.body.sources')}</h4>
                                    <ul>
                                        {msg.sources.map((source, i) => (
                                            <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title || source.uri}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {msg.usage && (
                                <div className="ai-message-usage select-none pointer-events-none mt-2 flex items-center text-[10px] uppercase tracking-wider font-medium text-primary/40">
                                    <Icon icon="zap" size={10} className="mr-1.5" />
                                    <span>{t('ai_assistant.usage.total', { count: msg.usage.totalTokens })}</span>
                                    <span className="mx-2 opacity-50">•</span>
                                    <span>{t('ai_assistant.usage.details', { prompt: msg.usage.promptTokens, completion: msg.usage.completionTokens })}</span>
                                </div>
                            )}
                        </div>
                        {msg.changeProposal && !msg.actionConfirmation && msg.changeDiff && (
                            <AiChangeProposal
                                changeDiff={msg.changeDiff}
                                onConfirm={() => onConfirmChanges(msg.changeProposal!)}
                                onCancel={() => onCancelChanges(index)}
                            />
                        )}
                        {msg.actionConfirmation?.action === 'CREATE_NEW_PROJECT' && (
                            <div className="ai-change-confirmation" style={{ marginTop: '1rem' }}>
                                {msg.changeProposal && msg.changeProposal.settings ? (
                                    <>
                                        <h4>{t('ai_assistant.body.proposal.preview_title')}</h4>
                                        <div style={{ marginBottom: '1rem', lineHeight: '1.6', paddingLeft: '0.5rem' }}>
                                            <p><strong>{t('ai_assistant.body.proposal.project_name')}</strong> {msg.changeProposal.settings.title}</p>
                                            <p><strong>{t('ai_assistant.body.proposal.company_name')}</strong> {msg.changeProposal.settings.companyName}</p>
                                            <p><strong>{t('ai_assistant.body.proposal.foundation_date')}</strong> {new Date(msg.changeProposal.settings.foundationDate).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                            <p><strong>{t('ai_assistant.body.proposal.legal_form')}</strong> {msg.changeProposal.settings.legalForm}</p>
                                            <p><strong>{t('ai_assistant.body.proposal.planning_years')}</strong> {msg.changeProposal.settings.planningYears}</p>
                                        </div>
                                    </>
                                ) : (
                                    <p>{t('ai_assistant.body.proposal.confirm_text')}</p>
                                )}
                                <div className="modal-actions">
                                    <button className="btn-secondary" onClick={() => onCancelChanges(index)}>{t('common.cancel')}</button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => onConfirmAction('CREATE_NEW_PROJECT', msg.changeProposal)}
                                    >
                                        {msg.changeProposal ? t('ai_assistant.body.proposal.create_project') : t('ai_assistant.body.proposal.create_empty')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {msg.kbChoiceAction && (
                            <div className="ai-change-confirmation" style={{ marginTop: '1rem' }}>
                                <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                                    <button 
                                        className="btn-primary py-1 px-3 text-sm" 
                                        onClick={() => onKbChoice(msg.kbChoiceAction!.fileName, true)}
                                    >
                                        {t('ai_assistant.body.kb.save_permanent')}
                                    </button>
                                    <button 
                                        className="btn-secondary py-1 px-3 text-sm" 
                                        onClick={() => onKbChoice(msg.kbChoiceAction!.fileName, false)}
                                    >
                                        {t('ai_assistant.body.kb.use_for_chat')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {msg.role === 'model' && !msg.continueAction && !msg.actionConfirmation && (index < chatHistory.length - 1 || !isLoading) && (
                            <div className="ai-message-feedback-group">
                                <div className="ai-message-feedback" style={{ opacity: msg.feedback ? 1 : undefined }}>
                                    <button 
                                        className={`feedback-btn ${msg.feedback === 'positive' ? 'active' : ''}`}
                                        onClick={() => onMessageFeedback(index, 'positive')}
                                        title={t('ai_assistant.body.feedback.positive_tooltip')}
                                    >
                                        <Icon icon="thumbs-up" size={16} />
                                    </button>
                                    <button 
                                        className={`feedback-btn ${msg.feedback === 'negative' ? 'active' : ''}`}
                                        onClick={() => onMessageFeedback(index, 'negative')}
                                        title={t('ai_assistant.body.feedback.negative_tooltip')}
                                    >
                                        <Icon icon="thumbs-down" size={16} />
                                    </button>
                                </div>
                                {msg.feedback && (
                                    <div className="ai-feedback-reason">
                                        <textarea
                                            placeholder={t('ai_assistant.body.feedback.reason_placeholder')}
                                            value={msg.feedbackReason || ''}
                                            onChange={(e) => onMessageFeedback(index, msg.feedback as 'positive' | 'negative', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            ))}
            {chatHistory.some(m => m.role === 'model') && (
                <div className="ai-training-export-container">
                    <button className="btn-secondary btn-sm" onClick={onExportTrainingData} title={chatHistory.some(m => m.feedback) ? t('ai_assistant.body.training.export_tooltip_with_feedback') : t('ai_assistant.body.training.export_tooltip_no_feedback')}>
                        <Icon icon="folderDownload" size={14} />
                        {t('ai_assistant.body.training.export_button', { count: chatHistory.filter(m => m.feedback).length })}
                    </button>
                </div>
            )}
        </div>
    );
};