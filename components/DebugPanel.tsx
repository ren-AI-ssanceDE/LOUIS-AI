/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const debugPanelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'var(--sidebar-bg)',
    color: 'var(--sidebar-text)',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-md)',
    zIndex: 9999,
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    width: '300px'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.4rem',
    border: '1px solid var(--input-border)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-color)',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    fontSize: '12px'
};

const buttonStyle: React.CSSProperties = {
    padding: '0.4rem 0.8rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
    fontSize: '12px'
};

export const DebugPanel = () => {
    const { t } = useTranslation();
    const [apiKey, setApiKey] = useState('');
    const [currentTempKey, setCurrentTempKey] = useState<string | null>(null);

    useEffect(() => {
        const storedKey = sessionStorage.getItem('temp_api_key');
        setCurrentTempKey(storedKey);
        setApiKey(storedKey || '');
    }, []);

    const handleSetKey = () => {
        if (apiKey.trim()) {
            sessionStorage.setItem('temp_api_key', apiKey.trim());
            setCurrentTempKey(apiKey.trim());
            alert(t('debug.set_alert'));
            window.location.reload();
        }
    };

    const handleClearKey = () => {
        sessionStorage.removeItem('temp_api_key');
        setCurrentTempKey(null);
        setApiKey('');
        alert(t('debug.clear_alert'));
        window.location.reload();
    };

    return (
        <div style={debugPanelStyle}>
            <h4 style={{ margin: '0 0 1rem 0' }}>{t('debug.title')}</h4>
            
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('debug.temp_key_label')}</label>
                <input 
                    type="password" 
                    style={inputStyle} 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t('debug.temp_key_placeholder')}
                />
                <div>
                    <button style={{ ...buttonStyle, backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleSetKey}>{t('debug.set_reload')}</button>
                    <button style={{ ...buttonStyle, backgroundColor: 'var(--secondary-color)', color: 'white' }} onClick={handleClearKey}>{t('debug.remove')}</button>
                </div>
                 {currentTempKey && <p style={{ fontSize: '10px', marginTop: '0.5rem', color: 'var(--positive-color)'}}>{t('debug.active_prefix')}{currentTempKey.slice(-4)}</p>}
            </div>

        </div>
    );
};
