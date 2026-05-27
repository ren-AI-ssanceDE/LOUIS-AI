/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

export const FillForwardIcon = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => {
    const { t } = useTranslation();
    return (
        <button 
            onClick={onClick} 
            title={t('common.fill_forward_hint')} 
            className="btn-fill-forward"
            type="button"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
        </button>
    );
};