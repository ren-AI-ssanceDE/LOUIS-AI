/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon.tsx';
import type { AiSettings, AiPersona } from '../../types.ts';

interface AiPersonaCardProps {
    aiSettings: AiSettings;
    personas: AiPersona[];
    handleSelectPersona: (id: string) => void;
    setEditingPersona: (persona: AiPersona | 'new') => void;
    handleExportPersona: (persona: AiPersona) => void;
    setDeletePersonaConfirm: (persona: AiPersona) => void;
    personaImportRef: React.RefObject<HTMLInputElement>;
    handlePersonaFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    allPersonas: AiPersona[];
}

export const AiPersonaCard = memo(({
    aiSettings, personas, handleSelectPersona, setEditingPersona,
    handleExportPersona, setDeletePersonaConfirm,
    personaImportRef, handlePersonaFileChange, allPersonas
}: AiPersonaCardProps) => {
    const { t } = useTranslation();

    return (
        <div className="card">
            <h2>{t('settings.ai_persona.title')}</h2>
             <div className="settings-section">
                <h3>{t('settings.ai_persona.manage_title')}</h3>
                 <div className="form-group">
                    <p className="help-text" style={{margin: '0 0 0.5rem 0'}}>{t('settings.ai_persona.manage_hint')}</p>
                    <div className="persona-selection-controls">
                        <button
                            className="btn-icon-primary"
                            onClick={() => setEditingPersona('new')}
                            disabled={(aiSettings.customPersonas || []).length >= 5}
                            title={t('settings.ai_persona.new_tooltip')}
                        >
                            <Icon icon="plus" size={18} strokeWidth={2.5} />
                        </button>
                        <select
                            value={aiSettings.selectedPersonaId || ''}
                            onChange={e => handleSelectPersona(e.target.value)}
                            aria-label={t('settings.ai_persona.title')}
                        >
                            {allPersonas.some(p => personas.some(dp => dp.id === p.id)) && (
                                <optgroup label={t('settings.ai_persona.premade_personas')}>
                                    {allPersonas.filter(p => personas.some(dp => dp.id === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            )}
                            {allPersonas.some(p => !personas.some(dp => dp.id === p.id)) && (
                                <optgroup label={t('settings.ai_persona.custom_personas')}>
                                    {allPersonas.filter(p => !personas.some(dp => dp.id === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            )}
                        </select>
                        <button
                            className="btn-icon-square"
                            onClick={() => {
                                const selectedId = aiSettings.selectedPersonaId;
                                const personaToEdit = allPersonas.find(p => p.id === selectedId);
                                if(personaToEdit) setEditingPersona(personaToEdit);
                            }}
                            title={t('settings.ai_persona.edit_tooltip')}
                        >
                            <Icon icon="edit" size={16} />
                        </button>
                        <button
                            className="btn-icon-square"
                            onClick={() => {
                                const selectedId = aiSettings.selectedPersonaId;
                                const personaToExp = allPersonas.find(p => p.id === selectedId);
                                if(personaToExp) handleExportPersona(personaToExp);
                            }}
                            title={t('settings.ai_persona.export_tooltip')}
                        >
                            <Icon icon="load" size={16} />
                        </button>
                        <button
                            className="btn-icon-danger"
                            onClick={() => {
                                const selectedId = aiSettings.selectedPersonaId;
                                const isCustom = (aiSettings.customPersonas || []).some(p => p.id === selectedId);
                                if (isCustom) {
                                    const personaToDel = (aiSettings.customPersonas || []).find(p => p.id === selectedId);
                                    if (personaToDel) setDeletePersonaConfirm(personaToDel);
                                }
                            }}
                            disabled={!(aiSettings.customPersonas || []).some(p => p.id === aiSettings.selectedPersonaId)}
                            title={t('settings.ai_persona.delete_tooltip')}
                        >
                            <Icon icon="trash" size={16} />
                        </button>
                    </div>
                    <div className="persona-management-actions" style={{ marginTop: '0.75rem', gap: '0.75rem' }}>
                        <div className="tooltip-wrapper" data-tooltip={t('settings.ai_persona.import_tooltip')}>
                            <button
                                className="btn-icon-primary"
                                onClick={() => personaImportRef.current?.click()}
                                disabled={(aiSettings.customPersonas || []).length >= 5}
                            >
                                <Icon icon="upload" size={16} />
                            </button>
                            <input type="file" ref={personaImportRef} onChange={handlePersonaFileChange} style={{display: 'none'}} accept=".json" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
