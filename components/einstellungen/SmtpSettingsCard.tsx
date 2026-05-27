/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon.tsx';
import type { AiSettings } from '../../types.ts';

interface SmtpSettingsCardProps {
    aiSettings: AiSettings;
    handleSmtpSettingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    testSmtpConnection: () => Promise<void>;
    testStatus: { type: 'ollama' | 'search' | 'openai' | 'smtp', status: 'loading' | 'success' | 'error', message?: string } | null;
}

export const SmtpSettingsCard = memo(({ aiSettings, handleSmtpSettingChange, testSmtpConnection, testStatus }: SmtpSettingsCardProps) => {
    const { t } = useTranslation();

    const isSmtpTesting = testStatus?.type === 'smtp' && testStatus?.status === 'loading';

    return (
        <div className="card">
            <h2>{t('settings.smtp.title')}</h2>
            <p className="help-text">{t('settings.smtp.hint')}</p>
            <div className="settings-section">
                <div className="form-group">
                    <label>{t('settings.smtp.host')}</label>
                    <input type="text" name="host" value={aiSettings.smtp?.host || ''} onChange={handleSmtpSettingChange} placeholder={t('settings.smtp.placeholder_host')} />
                </div>
                <div className="form-group">
                    <label>{t('settings.smtp.port')}</label>
                    <input type="number" name="port" value={aiSettings.smtp?.port || 587} onChange={handleSmtpSettingChange} />
                </div>
                <div className="form-group inline">
                    <label>{t('settings.smtp.secure')}</label>
                    <label className="switch">
                        <input type="checkbox" name="secure" checked={aiSettings.smtp?.secure || false} onChange={handleSmtpSettingChange} />
                        <span className="slider round"></span>
                    </label>
                </div>
                <div className="form-group">
                    <label>{t('settings.smtp.username')}</label>
                    <input type="text" name="user" value={aiSettings.smtp?.user || ''} onChange={handleSmtpSettingChange} />
                </div>
                <div className="form-group">
                    <label>{t('settings.smtp.password')}</label>
                    <input type="password" name="pass" value={aiSettings.smtp?.pass || ''} onChange={handleSmtpSettingChange} />
                </div>
                <div className="form-group">
                    <label>{t('settings.smtp.from')}</label>
                    <input type="email" name="from" value={aiSettings.smtp?.from || ''} onChange={handleSmtpSettingChange} placeholder={t('settings.smtp.placeholder_from')} />
                </div>
                
                <div className="settings-actions" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                        className={`btn-icon-primary ${isSmtpTesting ? 'loading' : ''}`}
                        onClick={testSmtpConnection}
                        disabled={isSmtpTesting}
                        title={t('settings.smtp.test_button')}
                    >
                        <Icon icon="check-circle" size={16} />
                    </button>
                    
                    {testStatus?.type === 'smtp' && (
                        <div className={`test-status ${testStatus.status}`} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`status-dot ${testStatus.status}`}></span>
                            {testStatus.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
