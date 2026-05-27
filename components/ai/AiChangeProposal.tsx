/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';

interface AiChangeProposalProps {
    changeDiff: string[];
    onConfirm: () => void;
    onCancel: () => void;
}

export const AiChangeProposal = ({ changeDiff, onConfirm, onCancel }: AiChangeProposalProps) => {
    const { t } = useTranslation();
    return (
        <div className="ai-change-confirmation">
            <h4>{t('ai_assistant.body.proposal.title')}</h4>
            <ul className="ai-change-list">
                {changeDiff.map((diff, i) => {
                    if (diff.startsWith('<li')) {
                        return <div key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(diff) }} />;
                    }
                    const type = diff.includes('[+]') ? 'add' : diff.includes('[-]') ? 'remove' : 'update';
                    return <li key={i} className={`change-${type}`}>{diff}</li>
                })}
            </ul>
            <div className="modal-actions">
                <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                <button className="btn-primary" onClick={onConfirm}>
                    {t('ai_assistant.body.proposal.confirm')}
                </button>
            </div>
        </div>
    );
};
