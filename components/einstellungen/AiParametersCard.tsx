/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon.tsx';
import type { AiSettings } from '../../types.ts';
import { fetchOllamaModels } from '../../services/aiService.ts';

interface AiParametersCardProps {
    aiSettings: AiSettings;
    handleAiSettingChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    testStatus: { type: 'ollama' | 'search' | 'openai' | 'smtp', status: 'loading' | 'success' | 'error', message?: string } | null;
    testOllamaConnection: () => void;
    testOpenAiConnection: () => void;
    testSearchConnection: () => void;
    handleResetAiParameters: () => void;
    handleExportAiSettings: () => void;
    aiSettingsImportRef: React.RefObject<HTMLInputElement>;
    handleAiSettingsFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AiParametersCard = memo(({
    aiSettings, handleAiSettingChange, testStatus,
    testOllamaConnection, testOpenAiConnection, testSearchConnection, handleResetAiParameters,
    handleExportAiSettings, aiSettingsImportRef, handleAiSettingsFileChange
}: AiParametersCardProps) => {
    const { t } = useTranslation();
    const [dynamicModels, setDynamicModels] = useState<string[]>([]);

    useEffect(() => {
        const loadModels = async () => {
            try {
                let models: string[] = [];
                if (aiSettings.provider === 'ollama') {
                    models = await fetchOllamaModels(aiSettings.ollamaUrl || 'http://localhost:11434');
                } else if (aiSettings.provider === 'gemini' && aiSettings.apiKeyGemini) {
                    const { fetchGeminiModels } = await import('../../services/aiService.ts');
                    models = await fetchGeminiModels(aiSettings.apiKeyGemini);
                } else if (aiSettings.provider === 'openai' && aiSettings.apiKeyOpenAI) {
                    const { fetchOpenAIModels } = await import('../../services/aiService.ts');
                    models = await fetchOpenAIModels(aiSettings.apiKeyOpenAI);
                } else if (aiSettings.provider === 'claude' && aiSettings.apiKeyClaude) {
                    const { fetchClaudeModels } = await import('../../services/aiService.ts');
                    models = await fetchClaudeModels(aiSettings.apiKeyClaude);
                }
                
                if (models.length > 0) {
                    setDynamicModels(models);
                } else {
                    setDynamicModels([]); // Reset if none found
                }
            } catch (err) {
                console.error("Failed to load models:", err);
            }
        };
        loadModels();
    }, [aiSettings.provider, aiSettings.ollamaUrl, aiSettings.apiKeyGemini, aiSettings.apiKeyOpenAI, aiSettings.apiKeyClaude]);

    return (
        <div className="card">
            <h2>{t('settings.ai_parameters.title')}</h2>
            <p className="help-text">
                {t('settings.ai_parameters.hint')}
            </p>
            <div className="settings-section">
                <h3>{t('settings.ai_parameters.provider_section')}</h3>
                <div className="form-group">
                    <label>{t('settings.ai_parameters.provider_label')}</label>
                    <select name="provider" value={aiSettings.provider || 'ollama'} onChange={handleAiSettingChange}>
                        <option value="ollama">{t('settings.ai_parameters.provider_ollama')}</option>
                        <option value="gemini">{t('settings.ai_parameters.provider_gemini')}</option>
                        <option value="openai">{t('settings.ai_parameters.provider_openai')}</option>
                        <option value="claude">{t('settings.ai_parameters.provider_claude')}</option>
                    </select>
                </div>

                {aiSettings.provider === 'ollama' && (
                    <div className="form-group">
                        <label>{t('settings.ai_parameters.ollama_url')}</label>
                        <div className="input-with-action">
                            <input 
                                type="text" 
                                name="ollamaUrl" 
                                value={aiSettings.ollamaUrl || ''} 
                                onChange={handleAiSettingChange} 
                                placeholder={t('settings.ai_parameters.placeholder_ollama_url')}
                            />
                            <button 
                                className={`btn-secondary btn-small ${testStatus?.type === 'ollama' && testStatus.status === 'loading' ? 'loading' : ''}`}
                                onClick={testOllamaConnection}
                                disabled={testStatus?.type === 'ollama' && testStatus.status === 'loading'}
                            >
                                {t('settings.ai_parameters.test_connection')}
                            </button>
                        </div>
                        <p className="help-text">{t('settings.ai_parameters.ollama_hint')}</p>
                        {testStatus?.type === 'ollama' && (
                            <p className={`test-status ${testStatus.status}`}>{testStatus.message}</p>
                        )}
                    </div>
                )}

                {aiSettings.provider === 'gemini' && (
                    <div className="form-group">
                        <label>{t('settings.ai_parameters.apikey_label', { provider: 'Gemini' })}</label>
                        <input 
                            type="password" 
                            name="apiKeyGemini" 
                            value={aiSettings.apiKeyGemini || ''} 
                            onChange={handleAiSettingChange} 
                            placeholder={t('settings.ai_parameters.apikey_placeholder')}
                        />
                        <p className="help-text">{t('settings.ai_parameters.apikey_hint')}</p>
                    </div>
                )}

                {aiSettings.provider === 'openai' && (
                    <>
                        <div className="form-group">
                            <label>{t('settings.ai_parameters.apikey_label', { provider: 'OpenAI / vLLM' })}</label>
                            <input 
                                type="password" 
                                name="apiKeyOpenAI" 
                                value={aiSettings.apiKeyOpenAI || ''} 
                                onChange={handleAiSettingChange} 
                                placeholder={t('settings.ai_parameters.apikey_placeholder')}
                            />
                            <p className="help-text">{t('settings.ai_parameters.openai_key_hint')}</p>
                        </div>
                        <div className="form-group">
                            <label>{t('settings.ai_parameters.openai_base_url')}</label>
                            <div className="input-with-action">
                                <input 
                                    type="text" 
                                    name="openAiBaseUrl" 
                                    value={aiSettings.openAiBaseUrl || ''} 
                                    onChange={handleAiSettingChange} 
                                    placeholder="https://api.openai.com/v1"
                                />
                                <button 
                                    className={`btn-secondary btn-small ${testStatus?.type === 'openai' && testStatus.status === 'loading' ? 'loading' : ''}`}
                                    onClick={testOpenAiConnection}
                                    disabled={testStatus?.type === 'openai' && testStatus.status === 'loading'}
                                >
                                    {t('settings.ai_parameters.test_connection')}
                                </button>
                            </div>
                            <p className="help-text">{t('settings.ai_parameters.openai_base_url_hint')}</p>
                            {testStatus?.type === 'openai' && (
                                <p className={`test-status ${testStatus.status}`}>{testStatus.message}</p>
                            )}
                        </div>
                    </>
                )}

                {aiSettings.provider === 'claude' && (
                    <div className="form-group">
                        <label>{t('settings.ai_parameters.apikey_label', { provider: 'Claude' })}</label>
                        <input 
                            type="password" 
                            name="apiKeyClaude" 
                            value={aiSettings.apiKeyClaude || ''} 
                            onChange={handleAiSettingChange} 
                            placeholder={t('settings.ai_parameters.apikey_placeholder')}
                        />
                        <p className="help-text">{t('settings.ai_parameters.apikey_hint')}</p>
                    </div>
                )}
            </div>

            <div className="settings-section">
                <h3>{t('settings.ai_parameters.model_section')}</h3>
                <div className="form-group">
                    <label>{t('settings.ai_parameters.model')}</label>
                    <input 
                        type="text" 
                        name="model" 
                        list="model-suggestions"
                        value={aiSettings.model || ''} 
                        onChange={handleAiSettingChange} 
                        placeholder={t('settings.ai_parameters.placeholder_model')}
                    />
                    <datalist id="model-suggestions">
                        {aiSettings.provider === 'gemini' && (
                            <>
                                {dynamicModels.length > 0 ? (
                                    dynamicModels.map(m => <option key={m} value={m} />)
                                ) : (
                                    <>
                                        <option value="gemini-2.5-flash" />
                                        <option value="gemini-2.5-pro" />
                                        <option value="gemini-2.0-flash" />
                                        <option value="gemini-2.0-flash-lite-preview-02-05" />
                                        <option value="gemini-2.0-pro-exp-02-05" />
                                    </>
                                )}
                            </>
                        )}
                        {aiSettings.provider === 'openai' && (
                            <>
                                {dynamicModels.length > 0 ? (
                                    dynamicModels.map(m => <option key={m} value={m} />)
                                ) : (
                                    <>
                                        <option value="gpt-4o" />
                                        <option value="gpt-4o-mini" />
                                        <option value="gpt-4-turbo" />
                                        <option value="o1-preview" />
                                        <option value="o1-mini" />
                                    </>
                                )}
                            </>
                        )}
                        {aiSettings.provider === 'claude' && (
                            <>
                                {dynamicModels.length > 0 ? (
                                    dynamicModels.map(m => <option key={m} value={m} />)
                                ) : (
                                    <>
                                        <option value="claude-3-7-sonnet-latest" />
                                        <option value="claude-3-5-sonnet-latest" />
                                        <option value="claude-3-5-haiku-latest" />
                                        <option value="claude-3-opus-20240229" />
                                    </>
                                )}
                            </>
                        )}
                        {aiSettings.provider === 'ollama' && (
                            <>
                                {dynamicModels.length > 0 ? (
                                    dynamicModels.map(m => <option key={m} value={m} />)
                                ) : (
                                    <>
                                        <option value="qwen2.5:14b" />
                                        <option value="llama3.1" />
                                        <option value="phi3" />
                                    </>
                                )}
                            </>
                        )}
                    </datalist>
                </div>
            </div>
            <div className="settings-section">
                <h3>{t('settings.ai_parameters.other_params_section')}</h3>
                <div className="form-group inline">
                    <label>{t('settings.ai_parameters.temperature')}</label>
                    <input type="range" name="temperature" min="0" max="1" step="0.1" value={aiSettings.temperature ?? 0.2} onChange={handleAiSettingChange} />
                    <span>{(aiSettings.temperature ?? 0.2).toFixed(1)}</span>
                </div>
                
                <div className="form-group inline">
                    <label>{t('settings.ai_parameters.top_p')}</label>
                    <input type="range" name="topP" min="0" max="1" step="0.05" value={aiSettings.topP ?? 0.4} onChange={handleAiSettingChange} />
                    <span>{(aiSettings.topP ?? 0.4).toFixed(2)}</span>
                </div>

                {(aiSettings.provider === 'ollama' || aiSettings.provider === 'gemini') && (
                    <div className="form-group inline">
                        <label>{t('settings.ai_parameters.top_k')}</label>
                        <input type="range" name="topK" min="1" max="100" step="1" value={aiSettings.topK ?? 30} onChange={handleAiSettingChange} />
                        <span>{aiSettings.topK ?? 30}</span>
                    </div>
                )}

                {aiSettings.provider === 'ollama' && (
                    <div className="form-group">
                        <label>{t('settings.ai_parameters.context_window')}</label>
                        <input type="number" name="numCtx" value={aiSettings.numCtx ?? 125000} onChange={handleAiSettingChange} />
                    </div>
                )}
                
                <div className="form-group">
                    <label>{aiSettings.provider === 'ollama' ? t('settings.ai_parameters.max_prediction') : t('settings.ai_parameters.max_tokens')}</label>
                    <input type="number" name="numPredict" value={aiSettings.numPredict ?? 32000} onChange={handleAiSettingChange} />
                </div>
            </div>
            <div className="settings-section">
                <h3>{t('settings.ai_parameters.search_section')}</h3>
                <div className="form-group inline">
                    <label>{t('settings.ai_parameters.search_enabled')}</label>
                    <label className="switch">
                        <input type="checkbox" name="searchEnabled" checked={aiSettings.searchEnabled} onChange={handleAiSettingChange} />
                        <span className="slider round"></span>
                    </label>
                </div>
                {aiSettings.searchEnabled && (
                    <div className="form-group">
                        <label>{t('settings.ai_parameters.search_provider')}</label>
                        <select 
                            name="searchProvider" 
                            value={aiSettings.searchProvider || 'duckduckgo'} 
                            onChange={handleAiSettingChange}
                            style={{ marginBottom: '1rem' }}
                        >
                            <option value="duckduckgo">{t('settings.ai_parameters.search_provider_ddg_label')}</option>
                            <option value="brave">{t('settings.ai_parameters.provider_brave')}</option>
                            <option value="google">{t('settings.ai_parameters.provider_google_scraper')}</option>
                            <option value="searxng">{t('settings.ai_parameters.search_provider_searxng_label')}</option>
                        </select>

                        {aiSettings.searchProvider === 'searxng' ? (
                            <>
                                <label>{t('settings.ai_parameters.search_url')}</label>
                                <div className="input-with-action">
                                    <input 
                                        type="text" 
                                        name="searchUrl" 
                                        value={aiSettings.searchUrl || ''} 
                                        onChange={handleAiSettingChange} 
                                        placeholder={t('settings.ai_parameters.placeholder_search_url')}
                                    />
                                    <button 
                                        className={`btn-secondary btn-small ${testStatus?.type === 'search' && testStatus.status === 'loading' ? 'loading' : ''}`}
                                        onClick={testSearchConnection}
                                        disabled={testStatus?.type === 'search' && testStatus.status === 'loading'}
                                    >
                                        {t('settings.ai_parameters.test_connection')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="input-with-action">
                                <span className="help-text" style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                    {aiSettings.searchProvider === 'duckduckgo' && t('settings.ai_parameters.search_provider_ddg_hint')}
                                    {aiSettings.searchProvider === 'brave' && t('settings.ai_parameters.search_provider_brave_hint')}
                                    {aiSettings.searchProvider === 'google' && t('settings.ai_parameters.search_provider_google_hint')}
                                </span>
                                <button 
                                    className={`btn-secondary btn-small ${testStatus?.type === 'search' && testStatus.status === 'loading' ? 'loading' : ''}`}
                                    onClick={testSearchConnection}
                                    disabled={testStatus?.type === 'search' && testStatus.status === 'loading'}
                                >
                                    {t('settings.ai_parameters.test_connection')}
                                </button>
                            </div>
                        )}
                        
                        <p className="help-text">{t('settings.ai_parameters.search_hint')}</p>
                        <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>{t('settings.ai_parameters.safe_search')}</label>
                                <select name="searchSafeSearch" value={aiSettings.searchSafeSearch || '0'} onChange={handleAiSettingChange}>
                                    <option value="0">{t('settings.ai_parameters.safe_search_off')}</option>
                                    <option value="1">{t('settings.ai_parameters.safe_search_moderate')}</option>
                                    <option value="2">{t('settings.ai_parameters.safe_search_strict')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('settings.ai_parameters.region_language')}</label>
                                <select name="searchRegion" value={aiSettings.searchRegion || 'all'} onChange={handleAiSettingChange}>
                                    <option value="all">{t('settings.ai_parameters.region_global')}</option>
                                    <option value="de-DE">{t('settings.ai_parameters.region_de')}</option>
                                    <option value="en-US">{t('settings.ai_parameters.region_us')}</option>
                                    <option value="en-GB">{t('settings.ai_parameters.region_gb')}</option>
                                    <option value="fr-FR">{t('settings.ai_parameters.region_fr')}</option>
                                    <option value="es-ES">{t('settings.ai_parameters.region_es')}</option>
                                    <option value="it-IT">{t('settings.ai_parameters.region_it')}</option>
                                </select>
                            </div>
                        </div>
                        {testStatus?.type === 'search' && (
                            <p className={`test-status ${testStatus.status}`}>{testStatus.message}</p>
                        )}
                    </div>
                )}
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: '2rem' }}>
                <div className="tooltip-wrapper" data-tooltip={t('settings.ai_parameters.reset_params')}>
                    <button className="btn-icon-square" onClick={handleResetAiParameters}>
                        <Icon icon="reset" size={16} />
                    </button>
                </div>
                <div className="tooltip-wrapper" data-tooltip={t('settings.ai_parameters.export_settings')}>
                    <button className="btn-icon-square" onClick={handleExportAiSettings}>
                        <Icon icon="load" size={16} />
                    </button>
                </div>
                <div className="tooltip-wrapper" data-tooltip={t('settings.ai_parameters.import_settings')}>
                    <button className="btn-icon-primary" onClick={() => aiSettingsImportRef.current?.click()}>
                        <Icon icon="upload" size={16} />
                    </button>
                    <input type="file" ref={aiSettingsImportRef} onChange={handleAiSettingsFileChange} style={{display: 'none'}} accept=".json" />
                </div>
            </div>
        </div>
    );
});
