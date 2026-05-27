/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, memo, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import type { AiSettings, SaveHistoryEntry, AiPersona, FinancialData, SavedChat, CustomAiPrompt, AppState } from '../types.ts';
import { PersonaEditorModal, DeletePersonaConfirmModal } from '../components/einstellungen/PersonaManagement.tsx';
import { PromptEditorModal, DeletePromptConfirmModal } from '../components/einstellungen/PromptManagement.tsx';
import { DeleteChatConfirmModal, ImportChatConfirmModal } from '../components/einstellungen/ChatManagement.tsx';
import { DataManagementCard } from '../components/einstellungen/DataManagementCard.tsx';
import { SmtpSettingsCard } from '../components/einstellungen/SmtpSettingsCard.tsx';
import { AiParametersCard } from '../components/einstellungen/AiParametersCard.tsx';
import { AiPersonaCard } from '../components/einstellungen/AiPersonaCard.tsx';
import { AiPromptCard } from '../components/einstellungen/AiPromptCard.tsx';
import { EmailSignatureCard } from '../components/einstellungen/EmailSignatureCard.tsx';
import { EmailTemplatesCard } from '../components/einstellungen/EmailTemplatesCard.tsx';

interface EinstellungenProps {
    theme: string;
    setTheme: (theme: string) => void;
    aiSettings: AiSettings;
    setAiSettings: (settings: AiSettings) => void;
    saveHistory: SaveHistoryEntry[];
    onRestore: (entry: SaveHistoryEntry) => void;
    onExportAll: () => void;
    onExportSingle: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    personas: AiPersona[];
    onDataChange: (data: Partial<FinancialData>) => void;
    savedChats: SavedChat[];
    customAiPrompts: CustomAiPrompt[];
    setCustomAiPrompts: (prompts: CustomAiPrompt[]) => void;
    setNotification: (notification: { message: string; id: number } | null) => void;
    showErrorModal: (error: { title: string; message: string }) => void;
    appState: AppState;
}

export const Einstellungen = memo(({
    theme, setTheme, aiSettings, setAiSettings, saveHistory, onRestore,
    onExportAll, onExportSingle, onImport,
    personas, onDataChange,
    savedChats, customAiPrompts, setCustomAiPrompts,
    setNotification, showErrorModal, appState
}: EinstellungenProps) => {
    const { t, i18n } = useTranslation();
    
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single'; chatId: string } | { type: 'all' } | null>(null);
    const [editingPersona, setEditingPersona] = useState<AiPersona | 'new' | null>(null);
    const [deletePersonaConfirm, setDeletePersonaConfirm] = useState<AiPersona | null>(null);
    const [importConfirm, setImportConfirm] = useState<{ newChats: SavedChat[]; chatsToOverwrite: { existing: SavedChat; new: SavedChat }[] } | null>(null);
    const [editingPrompt, setEditingPrompt] = useState<CustomAiPrompt | 'new' | null>(null);
    const [deletePromptConfirm, setDeletePromptConfirm] = useState<CustomAiPrompt | null>(null);
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [testStatus, setTestStatus] = useState<{ type: 'ollama' | 'search' | 'openai' | 'smtp', status: 'loading' | 'success' | 'error', message?: string } | null>(null);

    const personaImportRef = useRef<HTMLInputElement>(null);
    const chatImportRef = useRef<HTMLInputElement>(null);
    const promptImportRef = useRef<HTMLInputElement>(null);
    const aiSettingsImportRef = useRef<HTMLInputElement>(null);
    const projectImportRef = useRef<HTMLInputElement>(null);

    const allPersonas = useMemo(() => {
        const customPersonas = aiSettings.customPersonas || [];
        const customIds = new Set(customPersonas.map(p => p.id));
        const filteredDefaultPersonas = personas.filter(p => !customIds.has(p.id));
        return [...filteredDefaultPersonas, ...customPersonas];
    }, [personas, aiSettings.customPersonas]);

    const selectablePrompts = useMemo(() => {
        return customAiPrompts || [];
    }, [customAiPrompts]);

    const testSmtpConnection = async () => {
        setTestStatus({ type: 'smtp', status: 'loading' });
        try {
            if (!aiSettings.smtp || !aiSettings.smtp.host || !aiSettings.smtp.user || !aiSettings.smtp.pass) {
                throw new Error(t('settings.smtp.smtp_error', { defaultValue: 'Bitte SMTP-Konfiguration vervollständigen' }));
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp: aiSettings.smtp,
                    to: aiSettings.smtp.from || aiSettings.smtp.user,
                    subject: 'SMTP Test',
                    body: '<h1>SMTP Test</h1><p>Wenn Sie diese E-Mail erhalten, ist Ihre SMTP-Konfiguration korrekt.</p>',
                })
            });

            if (response.ok) {
                setTestStatus({ type: 'smtp', status: 'success', message: t('settings.smtp.test_success') });
            } else {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error: unknown) {
            setTestStatus({ 
                type: 'smtp', 
                status: 'error', 
                message: t('settings.smtp.test_error', { message: error instanceof Error ? error.message : String(error) })
            });
        }
    };


    useEffect(() => {
        // Set initial or fallback selected prompt from available prompts
        if (selectablePrompts && selectablePrompts.length > 0) {
            const isSelectedPromptAvailable = selectablePrompts.some(p => p && p.id === selectedPromptId);
            if (!selectedPromptId || !isSelectedPromptAvailable) {
                const firstPrompt = selectablePrompts[0];
                if (firstPrompt) {
                    setSelectedPromptId(firstPrompt.id);
                }
            }
        } else {
            setSelectedPromptId(null);
        }
    }, [selectablePrompts, selectedPromptId]);

    const handleAiSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const isNumeric = ['temperature', 'topK', 'topP', 'numCtx', 'numPredict'].includes(name);
        const isCheckbox = type === 'checkbox';
        
        let newSettings = {
            ...aiSettings,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (isNumeric ? parseFloat(value) : value),
        };

        // If provider changes, update model to a default one
        if (name === 'provider') {
            const provider = value;
            if (provider === 'gemini') {
                newSettings.model = 'gemini-2.5-flash';
                newSettings.temperature = 0.2;
                newSettings.topP = 0.95;
                newSettings.topK = 40;
                newSettings.numPredict = 32000;
            } else if (provider === 'openai') {
                newSettings.model = 'gpt-4o-mini';
                newSettings.temperature = 0.7;
                newSettings.topP = 1.0;
                newSettings.numPredict = 16384;
            } else if (provider === 'claude') {
                newSettings.model = 'claude-3-5-sonnet-latest';
                newSettings.temperature = 0.0;
                newSettings.numPredict = 4096;
            } else if (provider === 'ollama') {
                newSettings.model = 'qwen2.5:14b';
                newSettings.temperature = 0.2;
                newSettings.topP = 0.4;
                newSettings.topK = 30;
                newSettings.numCtx = 125000;
                newSettings.numPredict = 32000;
            }
        }
        
        setAiSettings(newSettings);
    };

    const handleSmtpSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) : value);
        setAiSettings({
            ...aiSettings,
            smtp: {
                ...(aiSettings.smtp || { host: '', port: 587, secure: false, user: '', pass: '', from: '' }),
                [name]: val
            }
        });
    };

    const handleSelectPersona = (personaId: string) => {
        setAiSettings({ ...aiSettings, selectedPersonaId: personaId });
    };

    const handleResetAiParameters = () => {
        setAiSettings({
            ...aiSettings,
            temperature: 0.2,
            topK: 30,
            topP: 0.4,
            numCtx: 125000,
            numPredict: 32000,
            searchSafeSearch: '0',
            searchRegion: 'all'
        });
    };
    
    const handleDeleteChat = (chatId: string) => {
        setDeleteConfirm({ type: 'single', chatId });
    };

    const handleDeleteAllChats = () => {
        if (savedChats.length === 0) return;
        setDeleteConfirm({ type: 'all' });
    };

    const confirmDelete = () => {
        if (!deleteConfirm) return;
    
        if (deleteConfirm.type === 'single') {
            const updatedChats = savedChats.filter(c => c.id !== deleteConfirm.chatId);
            onDataChange({ savedChats: updatedChats });
        } else if (deleteConfirm.type === 'all') {
            onDataChange({ savedChats: [] });
        }
        setDeleteConfirm(null);
    };

    const handleSavePersona = (personaData: { name: string, prompt: string }) => {
        if (editingPersona === 'new') {
            const newPersona: AiPersona = {
                ...personaData,
                id: uuidv4()
            };
            setAiSettings({
                ...aiSettings,
                customPersonas: [...(aiSettings.customPersonas || []), newPersona]
            });
        } else if (editingPersona) {
            const editingId = (editingPersona as AiPersona).id;
            const currentCustom = aiSettings.customPersonas || [];
            const isAlreadyCustom = currentCustom.some(p => p.id === editingId);

            if (isAlreadyCustom) {
                const updatedPersonas = currentCustom.map(p => 
                    p.id === editingId ? { ...p, ...personaData } : p
                );
                setAiSettings({
                    ...aiSettings,
                    customPersonas: updatedPersonas
                });
            } else {
                // Save default persona as custom override
                const newCustomPersona: AiPersona = {
                    ...editingPersona,
                    ...personaData,
                };
                setAiSettings({
                    ...aiSettings,
                    customPersonas: [...currentCustom, newCustomPersona]
                });
            }
        }
        setEditingPersona(null);
    };

    const handleDeletePersona = () => {
        if (!deletePersonaConfirm) return;
        const newPersonas = aiSettings.customPersonas.filter(p => p.id !== deletePersonaConfirm.id);
        const newSettings = { ...aiSettings, customPersonas: newPersonas };
        if (aiSettings.selectedPersonaId === deletePersonaConfirm.id) {
            newSettings.selectedPersonaId = personas[0]?.id || '';
        }
        setAiSettings(newSettings);
        setDeletePersonaConfirm(null);
    };

    const handleExportPersona = (persona: AiPersona) => {
        const { id, ...exportablePersona } = persona; // ID entfernen
        const dataStr = JSON.stringify(exportablePersona, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.download = `persona_${persona.name.replace(/\s/g, '_')}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handlePersonaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if ((aiSettings.customPersonas || []).length >= 5) {
            showErrorModal({
                title: t('settings.ai_persona.limit_reached'),
                message: t('settings.ai_persona.limit_message')
            });
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (typeof imported.name === 'string' && typeof imported.prompt === 'string') {
                    const newPersona: AiPersona = {
                        id: uuidv4(),
                        name: imported.name,
                        prompt: imported.prompt,
                    };
                     setAiSettings({
                        ...aiSettings,
                        customPersonas: [...(aiSettings.customPersonas || []), newPersona]
                    });
                    setNotification({ message: t('settings.ai_persona.import_success'), id: Date.now() });
                } else {
                    throw new Error(t('settings.ai_persona.format_error'));
                }
            } catch (error: unknown) {
                showErrorModal({
                    title: t('settings.ai_persona.import_failed'),
                    message: t('settings.ai_persona.import_failed_details', { message: error instanceof Error ? error.message : String(error) })
                });
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = ''; // Reset input
    };
    
    // --- CHAT MANAGEMENT ---
    const handleExportChat = (chatId: string) => {
        const chat = savedChats.find(c => c.id === chatId);
        if (!chat) return;
        const dataStr = JSON.stringify(chat, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `chat_${chat.name.substring(0, 20).replace(/\s/g, '_')}_${chat.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportAllChats = () => {
        if (savedChats.length === 0) return;
        const dataStr = JSON.stringify(savedChats, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `chats_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };
    
    const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsedJson = JSON.parse(event.target?.result as string);
                let importedChats: SavedChat[] = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
                
                const isValidChat = (c: unknown): c is SavedChat => {
                    const chat = c as SavedChat;
                    return chat && typeof chat.id === 'string' && typeof chat.name === 'string' && typeof chat.timestamp === 'string' && Array.isArray(chat.history);
                };
                importedChats = importedChats.filter(isValidChat);

                if (importedChats.length === 0) {
                    showErrorModal({ title: t('data_management.no_data_found'), message: t('data_management.no_valid_chats')});
                    return;
                }

                const existingChatIds = new Set(savedChats.map(c => c.id));
                const newChats: SavedChat[] = [];
                const chatsToOverwrite: { existing: SavedChat; new: SavedChat }[] = [];

                for (const chat of importedChats) {
                    if (existingChatIds.has(chat.id)) {
                        const existing = savedChats.find(c => c.id === chat.id)!;
                        chatsToOverwrite.push({ existing, new: chat });
                    } else {
                        newChats.push(chat);
                    }
                }

                const CHAT_LIMIT = 10;
                if ((savedChats.length - chatsToOverwrite.length + newChats.length) > CHAT_LIMIT) {
                    showErrorModal({ title: t('data_management.limit_exceeded'), message: t('data_management.limit_message', { limit: CHAT_LIMIT, current: savedChats.length, import: newChats.length })});
                    return;
                }
                
                if (chatsToOverwrite.length > 0) {
                    setImportConfirm({ newChats, chatsToOverwrite });
                } else if (newChats.length > 0) {
                    const updatedChats = [...savedChats, ...newChats].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    onDataChange({ savedChats: updatedChats });
                    setNotification({ message: t('data_management.import_success'), id: Date.now() });
                } else {
                    showErrorModal({ title: t('data_management.no_new_chats'), message: t('data_management.all_chats_exist')});
                }

            } catch (error: unknown) {
                showErrorModal({ title: t('data_management.import_failed'), message: t('data_management.import_failed_details', { message: error instanceof Error ? error.message : String(error) }) });
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const handleConfirmImport = () => {
        if (!importConfirm) return;
        const { newChats, chatsToOverwrite } = importConfirm;

        let updatedChats = [...savedChats];
        chatsToOverwrite.forEach(item => {
            const index = updatedChats.findIndex(c => c.id === item.existing.id);
            if (index !== -1) {
                updatedChats[index] = item.new;
            }
        });
        
        updatedChats.push(...newChats);
        updatedChats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        onDataChange({ savedChats: updatedChats });
        setImportConfirm(null);
        setNotification({ message: t('data_management.import_success'), id: Date.now() });
    };

    const handleSavePrompt = (promptData: { name: string, description: string, prompt: string }) => {
        const currentPrompts = customAiPrompts || [];
        if (editingPrompt === 'new') {
            const newPrompt: CustomAiPrompt = {
                ...promptData,
                id: uuidv4()
            };
            setCustomAiPrompts([...currentPrompts, newPrompt]);
        } else if (editingPrompt) {
            const editingId = (editingPrompt as CustomAiPrompt).id;
            const updatedPrompts = currentPrompts.map(p => 
                p.id === editingId ? { ...p, ...promptData } : p
            );
            setCustomAiPrompts(updatedPrompts);
        }
        setEditingPrompt(null);
    };

    const handleDeletePrompt = () => {
        if (!deletePromptConfirm) return;
        const newPrompts = (customAiPrompts || []).filter(p => p.id !== deletePromptConfirm.id);
        setCustomAiPrompts(newPrompts);
        setDeletePromptConfirm(null);
    };

     const handleExportPrompt = (prompt: CustomAiPrompt) => {
        const { id, ...exportablePrompt } = prompt; // ID entfernen
        const dataStr = JSON.stringify(exportablePrompt, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.download = `prompt_${prompt.name.replace(/\s/g, '_')}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handlePromptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if ((customAiPrompts || []).filter(p => !p.id.startsWith('prompt_default_')).length >= 25) {
            showErrorModal({
                title: t('settings.ai_prompt.limit_reached'),
                message: t('settings.ai_prompt.limit_message')
            });
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (typeof imported.name === 'string' && typeof imported.prompt === 'string' && typeof imported.description === 'string') {
                    const newPrompt: CustomAiPrompt = {
                        id: uuidv4(),
                        name: imported.name,
                        description: imported.description,
                        prompt: imported.prompt,
                    };
                     setCustomAiPrompts([...(customAiPrompts || []), newPrompt]);
                    setNotification({ message: t('settings.ai_prompt.import_success'), id: Date.now() });
                } else {
                    throw new Error(t('settings.ai_prompt.format_error'));
                }
            } catch (error: unknown) {
                showErrorModal({
                    title: t('settings.ai_prompt.import_failed'),
                    message: t('settings.ai_prompt.import_failed_details', { message: error instanceof Error ? error.message : String(error) })
                });
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = ''; // Reset input
    };

    const testOpenAiConnection = async () => {
        setTestStatus({ type: 'openai', status: 'loading' });
        try {
            const baseUrl = aiSettings.openAiBaseUrl || 'https://api.openai.com/v1';
            const apiKey = aiSettings.apiKeyOpenAI || '';

            const isHttps = window.location.protocol === 'https:';
            const isBaseUrlHttps = baseUrl.startsWith('https:');
            const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('192.168.') || baseUrl.includes('10.');
            const needsProxy = (isHttps && !isBaseUrlHttps) || (isLocal && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'));

            const targetUrl = new URL('/v1/models', baseUrl).toString();
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${apiKey}`
            };

            let response;
            if (needsProxy) {
                response = await fetch('/api/proxy/generic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: targetUrl,
                        method: 'GET',
                        headers
                    })
                });
            } else {
                response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    }
                });
            }

            if (response.ok) {
                setTestStatus({ type: 'openai', status: 'success', message: t('settings.ai_parameters.test_openai_success') });
            } else {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error: unknown) {
            setTestStatus({ 
                type: 'openai', 
                status: 'error', 
                message: t('settings.ai_parameters.test_openai_error', { message: error instanceof Error ? error.message : String(error) })
            });
        }
    };

    const testOllamaConnection = async () => {
        setTestStatus({ type: 'ollama', status: 'loading' });
        try {
            const baseUrl = aiSettings.ollamaUrl || 'http://localhost:11434';
            const url = new URL('/api/tags', baseUrl).toString();
            const response = await fetch(url);
            if (response.ok) {
                setTestStatus({ type: 'ollama', status: 'success', message: t('settings.ai_parameters.test_ollama_success') });
            } else {
                throw new Error(`Fehler: ${response.status} ${response.statusText}`);
            }
        } catch (error: unknown) {
            setTestStatus({ 
                type: 'ollama', 
                status: 'error', 
                message: t('settings.ai_parameters.test_ollama_error', { message: error instanceof Error ? error.message : String(error) })
            });
        }
    };

    const testSearchConnection = async () => {
        setTestStatus({ type: 'search', status: 'loading' });
        try {
            const provider = aiSettings.searchProvider || 'duckduckgo';
            const baseUrl = aiSettings.searchUrl || 'https://duckduckgo.com';
            
            // Try different queries if the first one fails
            const testQueries = ['LouisAI', 'Finanzplan Software', 'Unternehmensberatung'];
            let lastError = null;

            for (const q of testQueries) {
                const proxyUrl = new URL('/api/proxy/search', window.location.origin);
                proxyUrl.searchParams.append('url', baseUrl);
                proxyUrl.searchParams.append('q', q);
                proxyUrl.searchParams.append('provider', provider);
                
                if (provider === 'duckduckgo' || provider === 'google' || provider === 'brave') {
                    const kp = aiSettings.searchSafeSearch === '0' ? '-2' : (aiSettings.searchSafeSearch === '2' ? '1' : '-1');
                    const kl = (aiSettings.searchRegion || 'all') === 'all' ? 'wt-wt' : (aiSettings.searchRegion || 'all').toLowerCase();
                    proxyUrl.searchParams.append('kp', kp);
                    proxyUrl.searchParams.append('kl', kl);
                } else {
                    proxyUrl.searchParams.append('safesearch', aiSettings.searchSafeSearch || '0');
                    proxyUrl.searchParams.append('language', aiSettings.searchRegion || 'all');
                }
                
                try {
                    const response = await fetch(proxyUrl.toString());
                    const data = await response.json();
                    
                    if (response.ok && data.results && data.results.length > 0) {
                        console.log(`[SETTINGS] Search test success for "${q}". Found ${data.results.length} results.`);
                        setTestStatus({ type: 'search', status: 'success', message: t('settings.ai_parameters.test_search_success') });
                        return; // Found results, stop
                    } else if (data.error && response.status === 429) {
                        lastError = data.error;
                        break; // Rate limit, no point trying more
                    } else {
                        lastError = data.error || data.message || 'Empty results';
                    }
                } catch (e: unknown) {
                    lastError = e instanceof Error ? e.message : String(e);
                }
                
                // Wait a bit before next attempt
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            throw new Error(lastError || 'Empty results');
        } catch (error: unknown) {
            console.error("[SETTINGS] Search test error:", error);
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            // Provide more user-friendly messages for common scraping issues
            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('too many requests') || errorMessage.toLowerCase().includes('rate-limit')) {
                errorMessage = "Rate-Limit erreicht. Der Suchanbieter (z.B. Google/Brave) blockiert automatisierte Anfragen von diesem Server. Bitte versuchen Sie es mit DuckDuckGo oder einem eigenen SearXNG.";
            } else if (errorMessage === 'Empty results' || errorMessage.includes('no results') || errorMessage.includes('No results found')) {
                errorMessage = "Keine Ergebnisse gefunden. Dies kann passieren, wenn der Provider (z.B. Google) automatisierte Anfragen blockiert oder der Suchbegriff zu spezifisch ist.";
            } else if (errorMessage.toLowerCase().includes('blocked') || errorMessage.toLowerCase().includes('captcha')) {
                errorMessage = "Der Suchanbieter hat die Anfrage blockiert (Captcha/Bot-Schutz).";
            }
            
            let msg = t('settings.ai_parameters.test_search_error', { message: errorMessage });
            setTestStatus({ 
                type: 'search', 
                status: 'error', 
                message: msg
            });
        }
    };

    const handleExportAiSettings = () => {
        const dataStr = JSON.stringify(aiSettings, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ai_settings_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleAiSettingsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (imported && typeof imported === 'object') {
                    setAiSettings({ ...aiSettings, ...imported });
                    setNotification({ message: t('settings.ai_parameters.import_settings_success'), id: Date.now() });
                } else {
                    throw new Error(t('data_management.invalid_format'));
                }
            } catch (error: unknown) {
                showErrorModal({ title: t('data_management.import_failed'), message: t('data_management.import_failed_details', { message: error instanceof Error ? error.message : String(error) }) });
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };


    return (
        <>
            <div className="einstellungen-layout">
                <div className="einstellungen-column">
                    <DataManagementCard 
                        saveHistory={saveHistory}
                        onRestore={onRestore}
                        savedChats={savedChats}
                        handleExportChat={handleExportChat}
                        handleDeleteChat={handleDeleteChat}
                        chatImportRef={chatImportRef}
                        handleChatFileChange={handleChatFileChange}
                        handleExportAllChats={handleExportAllChats}
                        handleDeleteAllChats={handleDeleteAllChats}
                        onExportAll={onExportAll}
                        onExportSingle={onExportSingle}
                        projectImportRef={projectImportRef}
                        onImport={onImport}
                        appState={appState}
                        setNotification={setNotification}
                    />
                     <div className="card">
                        <h2>{t('settings.design_legal')}</h2>
                        <div className="settings-section">
                            <h3>{t('settings.language_selection')}</h3>
                            <div className="form-group">
                                <div className="persona-selection-controls" style={{ maxWidth: '300px' }}>
                                    <select 
                                        value={i18n.language} 
                                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                                        aria-label={t('settings.language_selection')}
                                    >
                                        <option value="de">{t('settings.languages.de')}</option>
                                        <option value="en">{t('settings.languages.en')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="settings-section">
                            <h3>{t('settings.theme')}</h3>
                            <div className="theme-switcher">
                                <span>{t('settings.themes.light')}</span>
                                <label className="switch">
                                    <input type="checkbox" checked={theme === 'dark'} onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
                                    <span className="slider round"></span>
                                </label>
                                <span>{t('settings.themes.dark')}</span>
                            </div>
                        </div>
                        <div className="settings-section">
                             <h3>{t('settings.disclaimer_title')}</h3>
                             <p>{t('settings.disclaimer_text')}</p>
                        </div>
                    </div>

                    <SmtpSettingsCard 
                        aiSettings={aiSettings}
                        handleSmtpSettingChange={handleSmtpSettingChange}
                        testSmtpConnection={testSmtpConnection}
                        testStatus={testStatus}
                    />
                    <EmailSignatureCard 
                        aiSettings={aiSettings}
                        setAiSettings={setAiSettings}
                        setNotification={setNotification}
                        showErrorModal={showErrorModal}
                    />
                    <EmailTemplatesCard 
                        aiSettings={aiSettings}
                        setAiSettings={setAiSettings}
                        setNotification={setNotification}
                        showErrorModal={showErrorModal}
                    />
                </div>
                <div className="einstellungen-column">
                    <AiParametersCard 
                        aiSettings={aiSettings}
                        handleAiSettingChange={handleAiSettingChange}
                        testStatus={testStatus}
                        testOllamaConnection={testOllamaConnection}
                        testOpenAiConnection={testOpenAiConnection}
                        testSearchConnection={testSearchConnection}
                        handleResetAiParameters={handleResetAiParameters}
                        handleExportAiSettings={handleExportAiSettings}
                        aiSettingsImportRef={aiSettingsImportRef}
                        handleAiSettingsFileChange={handleAiSettingsFileChange}
                    />
                    <AiPersonaCard 
                        aiSettings={aiSettings}
                        personas={personas}
                        handleSelectPersona={handleSelectPersona}
                        setEditingPersona={setEditingPersona}
                        handleExportPersona={handleExportPersona}
                        setDeletePersonaConfirm={setDeletePersonaConfirm}
                        personaImportRef={personaImportRef}
                        handlePersonaFileChange={handlePersonaFileChange}
                        allPersonas={allPersonas}
                    />
                    <AiPromptCard 
                        setEditingPrompt={setEditingPrompt}
                        customAiPrompts={customAiPrompts}
                        selectedPromptId={selectedPromptId}
                        setSelectedPromptId={setSelectedPromptId}
                        handleExportPrompt={handleExportPrompt}
                        setDeletePromptConfirm={setDeletePromptConfirm}
                        promptImportRef={promptImportRef}
                        handlePromptFileChange={handlePromptFileChange}
                        selectablePrompts={selectablePrompts}
                    />
                </div>
            </div>
            {deleteConfirm && (
                <DeleteChatConfirmModal 
                    type={deleteConfirm.type}
                    chatId={deleteConfirm.type === 'single' ? deleteConfirm.chatId : ''}
                    savedChats={savedChats}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
            {editingPersona && (
                <PersonaEditorModal 
                    editingPersona={editingPersona}
                    onSave={handleSavePersona}
                    onClose={() => setEditingPersona(null)}
                    showErrorModal={showErrorModal}
                />
            )}
            {editingPrompt && (
                <PromptEditorModal
                    editingPrompt={editingPrompt}
                    onSave={handleSavePrompt}
                    onClose={() => setEditingPrompt(null)}
                    showErrorModal={showErrorModal}
                />
            )}
            {deletePersonaConfirm && (
                <DeletePersonaConfirmModal 
                    personaName={deletePersonaConfirm.name}
                    onConfirm={handleDeletePersona}
                    onCancel={() => setDeletePersonaConfirm(null)}
                />
            )}
            {deletePromptConfirm && (
                <DeletePromptConfirmModal 
                    promptName={deletePromptConfirm.name}
                    onConfirm={handleDeletePrompt}
                    onCancel={() => setDeletePromptConfirm(null)}
                />
            )}
            {importConfirm && (
                <ImportChatConfirmModal 
                    importConfirm={importConfirm}
                    onConfirm={handleConfirmImport}
                    onCancel={() => setImportConfirm(null)}
                />
            )}
        </>
    );
});