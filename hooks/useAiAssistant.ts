/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { detectRelevantSlices, buildOptimizedContext, getProjectedSchema } from '../services/aiContextService.ts';
import { vectorService } from '../services/vectorService.ts';
import { roundNumbers, extractJsonFromString } from '../utils.ts';
import { getSystemPrompt } from '../components/ai/prompts.ts';
import { createDefaultFinancialData } from '../data.ts';
import { toolRegistry } from '../components/ai/tools/index.ts';
import { Orchestrator } from '../components/ai/agents/Orchestrator.ts';
import { Critic } from '../components/ai/agents/Critic.ts';
import { callAi, AiMessage, summarizeHistory } from '../services/aiService.ts';
import { diffFinancialData } from '../services/aiDiffService.ts';
import { simpleMarkdownToHtml } from '../services/markdownService.ts';
import type { FinancialData, AiSettings, AppState, AiPersona, ChatMessage, SavedChat, ViewType, CalculationResults, TokenUsage } from '../types.ts';

type UseAiAssistantProps = {
    projectData: FinancialData;
    calculations: CalculationResults | null;
    aiSettings: AiSettings;
    onDataChange: (data: Partial<FinancialData>) => void;
    appState: AppState;
    personas: AiPersona[];
    handleNewProjectFromData: (data: FinancialData) => void;
    view: ViewType;
};

export const useAiAssistant = ({
    projectData,
    calculations,
    aiSettings,
    onDataChange,
    appState,
    personas,
    handleNewProjectFromData,
    view
}: UseAiAssistantProps) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isCancelledRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [uploadedFile, setUploadedFile] = useState<{ name: string, base64Data?: string, mimeType?: string, textContent?: string } | null>(null);
    const [forcedTools, setForcedTools] = useState<Set<string>>(new Set());
    const [isIngesting, setIsIngesting] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ file: File; id: string } | null>(null);
    const [chatMemory, setChatMemory] = useState<string | null>(null);
    const sessionCharCountRef = useRef(0);
    const [selectedChatId, setSelectedChatId] = useState<string>('');
    const [isChatSaved, setIsChatSaved] = useState(false);
    const [reviewProposal, setReviewProposal] = useState<{ origin: FinancialData, proposed: FinancialData, isNewProject?: boolean } | null>(null);

    const sumUsage = (base?: TokenUsage, add?: TokenUsage): TokenUsage | undefined => {
        if (!add) return base;
        if (!base) return add;
        return {
            promptTokens: base.promptTokens + add.promptTokens,
            completionTokens: base.completionTokens + add.completionTokens,
            totalTokens: base.totalTokens + add.totalTokens
        };
    };

    const createMessage = (role: 'user' | 'model' | 'error', content: string, extra?: Partial<ChatMessage>): ChatMessage => {
        const now = new Date().toISOString();
        return {
            id: uuidv4(),
            role,
            content,
            createdAt: now,
            updatedAt: now,
            ...extra
        };
    };

    const orchestrator = useMemo(() => new Orchestrator(aiSettings), [aiSettings]);
    const critic = useMemo(() => new Critic(aiSettings), [aiSettings]);

    const savedChats = useMemo(() => projectData.savedChats || [], [projectData.savedChats]);
    const allPersonas = useMemo(() => [...personas, ...(aiSettings.customPersonas || [])], [personas, aiSettings.customPersonas]);

    const prevPersonaIdRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const currentId = aiSettings.selectedPersonaId;
        if (prevPersonaIdRef.current !== undefined && prevPersonaIdRef.current !== currentId) {
            if (chatHistory.length > 0) {
                const newPersona = allPersonas.find(p => p.id === currentId);
                const systemMessage = createMessage('model', `Persona wurde zu <strong>${newPersona?.name || 'Standard'}</strong> gewechselt. Der vorherige Chatverlauf wurde aus Konsistenzgründen zurückgesetzt.`);
                setChatHistory([systemMessage]);
                setUploadedFile(null);
                setSelectedChatId('');
            }
        }
        prevPersonaIdRef.current = currentId;
    }, [aiSettings.selectedPersonaId, allPersonas, chatHistory.length]);

    useEffect(() => {
        if (savedChats.length > 0 && !savedChats.some(c => c.id === selectedChatId)) {
            setSelectedChatId('');
        }
    }, [savedChats, selectedChatId]);
    
    useEffect(() => {
        if (chatHistory.length === 0) {
            setIsChatSaved(false);
            return;
        }
        const currentChatHistoryString = JSON.stringify(chatHistory);
        const isCurrentlySaved = savedChats.some(savedChat => JSON.stringify(savedChat.history) === currentChatHistoryString);
        setIsChatSaved(isCurrentlySaved);
    }, [chatHistory, savedChats]);

    const handleCancelRequest = () => {
        isCancelledRef.current = true;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            if (lastMessage && lastMessage.role === 'model' && !lastMessage.changeProposal && !lastMessage.actionConfirmation && !lastMessage.sources) {
                newHistory[newHistory.length - 1] = { 
                    ...lastMessage,
                    content: 'Anfrage abgebrochen.',
                    updatedAt: new Date().toISOString()
                };
            }
            return newHistory;
        });
    };

    const performAiRequest = async (prompt: string, historyForApiCall?: ChatMessage[]) => {
        isCancelledRef.current = false;
        setIsLoading(true);

        const requestId = `req-${Date.now()}`;
        const thinkingMsgId = `thinking-${requestId}`;
        
        const now = new Date().toISOString();
        setChatHistory(prev => [
            ...prev,
            { 
                role: 'model', 
                content: `<div class="ai-thinking-step"><span class="ai-thinking-spinner"></span> Initialisiere Agenten-Prozess...</div>`,
                rawContent: "[System: Initialisiere...]",
                id: thinkingMsgId,
                createdAt: now,
                updatedAt: now
            }
        ]);

        const updateThinkingMessage = (message: string) => {
            setChatHistory(prev => {
                const newHistory = [...prev];
                const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                const targetMsg = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1];
                
                if (targetMsg?.role === 'model' && !targetMsg.changeProposal && !targetMsg.actionConfirmation && !targetMsg.sources) {
                    // Use a stable wrapper div with a fixed class to allow CSS-based sizing stabilization
                    targetMsg.content = `<div class="ai-thinking-step-container"><div class="ai-thinking-step"><span class="ai-thinking-spinner"></span> ${message}</div></div>`;
                }
                return newHistory;
            });
        };        const processFinalResponse = async (fullResponseText: string, sources?: { uri: string, title: string }[], contextAtTime?: ChatMessage['contextAtTime'], planReasoning?: string, usage?: TokenUsage) => {
            try {
                let thought = planReasoning || "";
                let cleanedResponse = fullResponseText;
                const thoughtMatch = fullResponseText.match(/<thought>([\s\S]*?)<\/thought>/i);
                if (thoughtMatch) {
                    thought = thoughtMatch[1].trim();
                    cleanedResponse = fullResponseText.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim();
                }

                const jsonString = extractJsonFromString(cleanedResponse);
                if (!jsonString) {
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                        const lastMsg = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1];
                        
                        // Handle potential raw markdown that should be rendered
                        lastMsg.content = simpleMarkdownToHtml(cleanedResponse);
                        lastMsg.rawContent = cleanedResponse;
                        lastMsg.thought = thought;
                        lastMsg.usage = usage;
                        if (sources) lastMsg.sources = sources;
                        if (contextAtTime) lastMsg.contextAtTime = contextAtTime;
                        return newHistory;
                    });
                    return;
                }
                
                let responseJson: any = null;
                try {
                   responseJson = JSON.parse(jsonString);
                } catch (e) {
                    console.error("Failed to parse JSON from AI response:", e);
                    // Fallback to markdown rendering if JSON is invalid
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                        const lastMsg = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1];
                        lastMsg.content = simpleMarkdownToHtml(cleanedResponse);
                        lastMsg.rawContent = cleanedResponse;
                        lastMsg.thought = thought;
                        lastMsg.usage = usage;
                        if (sources) lastMsg.sources = sources;
                        if (contextAtTime) lastMsg.contextAtTime = contextAtTime;
                        return newHistory;
                    });
                    return;
                }

                if (responseJson.modifiedData) {
                    responseJson.modifiedData = roundNumbers(responseJson.modifiedData);
                }

                // If the model returns the data directly at top level instead of in modifiedData
                if (responseJson && !responseJson.modifiedData && responseJson.settings && (responseJson.products || responseJson.operationalCosts)) {
                    responseJson = {
                        followUpResponse: responseJson.followUpResponse || responseJson.answer || responseJson.message || "Ich habe die gewünschten Änderungen an Ihrem Plan vorgenommen.",
                        modifiedData: responseJson
                    };
                }

                const proposedDataJSON = responseJson.modifiedData;
                const proposedAction = responseJson.action;

                // Support more field names for the text response
                const textResponse = responseJson.followUpResponse || 
                                     responseJson.answer || 
                                     responseJson.message || 
                                     responseJson.response || 
                                     responseJson.analysis || 
                                     responseJson.text ||
                                     (responseJson.thought && !thought ? responseJson.thought : null);

                if (proposedAction === 'CREATE_NEW_PROJECT' && proposedDataJSON) {
                    const financeResult = await toolRegistry.financial_architect.execute('', { 
                        proposedData: proposedDataJSON, 
                        currentProjectData: projectData, 
                        isNewProject: true 
                    });
                    
                    if (!financeResult.success) {
                        throw new Error(financeResult.message || "Finanzdaten-Validierung fehlgeschlagen");
                    }
                    
                    const proposedData = financeResult.data as FinancialData;
                    const baseData = createDefaultFinancialData();
                    
                    setChatHistory(prev => { 
                        const newHistory = [...prev]; 
                        const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                        const lastMessage = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1]; 
                        lastMessage.content = simpleMarkdownToHtml(textResponse || 'Soll ich ein neues Projekt basierend auf diesen Daten erstellen?'); 
                        lastMessage.rawContent = textResponse || 'Soll ich ein neues Projekt basierend auf diesen Daten erstellen?';
                        lastMessage.thought = thought || responseJson.thought;
                        lastMessage.usage = usage;
                        lastMessage.actionConfirmation = { action: 'CREATE_NEW_PROJECT' }; 
                        lastMessage.changeProposal = proposedData; 
                        lastMessage.changeDiff = diffFinancialData(baseData, proposedData);
                        
                        if (sources) lastMessage.sources = sources; 
                        if (contextAtTime) lastMessage.contextAtTime = contextAtTime;
                        return newHistory; 
                    });
                } else if (textResponse && !proposedDataJSON) {
                    setChatHistory(prev => { 
                        const newHistory = [...prev]; 
                        const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                        const lastMsg = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1];
                        const finalContent = textResponse;
                        lastMsg.content = simpleMarkdownToHtml(finalContent); 
                        lastMsg.rawContent = finalContent;
                        lastMsg.thought = thought || responseJson.thought;
                        lastMsg.usage = usage;
                        if (sources) lastMsg.sources = sources; 
                        if (contextAtTime) lastMsg.contextAtTime = contextAtTime;
                        return newHistory; 
                    });
                } else if (proposedDataJSON) {
                    const financeResult = await toolRegistry.financial_architect.execute('', { 
                        proposedData: proposedDataJSON, 
                        currentProjectData: projectData, 
                        isNewProject: false 
                    });
                    
                    if (!financeResult.success) {
                         throw new Error(financeResult.message || "Finanzdaten-Validierung fehlgeschlagen");
                    }

                    const proposedData = financeResult.data as FinancialData;
                    const changeDiff = diffFinancialData(projectData, proposedData);
                    
                    setChatHistory(prev => { 
                        const newHistory = [...prev]; 
                        const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                        const lastMessage = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1]; 
                        if (changeDiff.length === 0) { 
                            const emptyDiffNote = "\n\n*(Hinweis: Die KI hat zwar eine Änderung bestätigt, aber die gelieferten Daten sind identisch mit dem aktuellen Stand. Es wurde keine Änderungsprüfung ausgelöst.)*";
                            lastMessage.content = simpleMarkdownToHtml((textResponse || "Ich habe keine Änderungen am Datenmodell vorgenommen.") + emptyDiffNote); 
                            lastMessage.rawContent = (textResponse || "Ich habe keine Änderungen am Datenmodell vorgenommen.") + emptyDiffNote;
                        } else { 
                            lastMessage.content = simpleMarkdownToHtml(textResponse || "Ich habe einen Vorschlag zur Änderung Ihres Plans:"); 
                            lastMessage.rawContent = textResponse || "Ich habe einen Vorschlag zur Änderung Ihres Plans:";
                            lastMessage.changeProposal = proposedData; 
                            lastMessage.changeDiff = changeDiff; 
                        } 
                        lastMessage.thought = thought || responseJson.thought;
                        lastMessage.usage = usage;
                        if (sources) lastMessage.sources = sources; 
                        if (contextAtTime) lastMessage.contextAtTime = contextAtTime;
                        return newHistory; 
                    });
                } else { 
                    // Final fallback: if JSON parsing worked but no fields matched, show the cleaned response instead of a dry error if possible
                    setChatHistory(prev => { 
                        const newHistory = [...prev]; 
                        const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                        const lastMsg = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1];
                        
                        const fallbackContent = cleanedResponse || "Ihre Anfrage konnte nicht verarbeitet werden.";
                        lastMsg.content = simpleMarkdownToHtml(fallbackContent); 
                        lastMsg.rawContent = fallbackContent;
                        lastMsg.thought = thought;
                        lastMsg.usage = usage;
                        if (sources) lastMsg.sources = sources; 
                        if (contextAtTime) lastMsg.contextAtTime = contextAtTime;
                        return newHistory; 
                    }); 
                }
            } catch (e: unknown) { 
                const errorMessage = e instanceof Error ? e.message : 'Die Antwort war kein valides JSON.';
                setChatHistory(prev => { 
                    const newHistory = [...prev]; 
                    const msgIndex = newHistory.findIndex(m => m.id === thinkingMsgId);
                    const lastMessage = msgIndex !== -1 ? newHistory[msgIndex] : newHistory[newHistory.length - 1]; 
                    lastMessage.role = 'error'; 
                    lastMessage.content = `Fehler: Die KI hat eine unerwartete Antwort gegeben. Details: ${errorMessage} Antworttext: ${fullResponseText}`; 
                    if (contextAtTime) lastMessage.contextAtTime = contextAtTime;
                    return newHistory; 
                }); 
            }
        };

        try {
            const historyToUse = historyForApiCall || chatHistory;
            const SLIDING_WINDOW_SIZE = 12;
            const slidingWindowHistory = historyToUse.slice(-SLIDING_WINDOW_SIZE);

            let historyForOllama = slidingWindowHistory.map(msg => {
                let content = msg.rawContent || msg.content;
                if (msg.role === 'model') {
                    if (!msg.rawContent) {
                        content = msg.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    }
                    if (msg.changeDiff && msg.changeDiff.length > 0) {
                        content += "\n\n[Ich habe folgende Änderungen vorgeschlagen: " + msg.changeDiff.join(", ") + "]";
                    }
                    if (msg.sources && msg.sources.length > 0) {
                        content += "\n\n[Ich habe Informationen aus dem Web einbezogen: " + msg.sources.map(s => s.title).join(", ") + "]";
                    }
                } else {
                    content = content.replace(/<[^>]*>/g, ' ').trim();
                }
                if (content.length > 8000) {
                    content = content.substring(0, 8000) + "... [Inhalt gekürzt]";
                }
                return { role: msg.role === 'user' ? 'user' : 'model', content: content } as ChatMessage;
            });

            updateThinkingMessage('Lagebesprechung & Missionsplanung...');
            
            let executionContext = {
                searchContext: "",
                localContext: "",
                thinkingResults: "",
                sources: [] as { uri: string, title: string }[]
            };

            let intent: 'DATA_CHANGE' | 'ANALYSIS' | 'GENERAL' = 'GENERAL';
            let orchestratorReasoning = "";
            let isComplete = false;
            let iterationCount = 0;
            const maxIterations = 4;

            let totalUsage: TokenUsage | undefined = undefined;

            while (!isComplete && iterationCount < maxIterations) {
                if (isCancelledRef.current) break;
                iterationCount++;

                const currentResultsForOrchestrator = `
WEB_SEARCH: ${executionContext.searchContext || "Keine Ergebnisse"}
LOCAL_KNOWLEDGE: ${executionContext.localContext || "Keine Ergebnisse"}
FINANCIAL_VALIDATION: ${executionContext.thinkingResults || "Noch nicht validiert"}
`.trim();

                const strategicPlanResult = await orchestrator.plan(prompt, historyForOllama, forcedTools, currentResultsForOrchestrator);
                intent = strategicPlanResult.plan.intent;
                orchestratorReasoning = strategicPlanResult.plan.reasoning;
                isComplete = strategicPlanResult.plan.isComplete || false;
                totalUsage = sumUsage(totalUsage, strategicPlanResult.usage);
                
                if (orchestratorReasoning) {
                    updateThinkingMessage(`Plan (${iterationCount}/${maxIterations}): ${orchestratorReasoning}`);
                    await new Promise(r => setTimeout(r, 600));
                }

                if (isComplete || strategicPlanResult.plan.plan.length === 0) {
                    break;
                }

                // Execute the steps returned by the orchestrator for this iteration
                for (const step of strategicPlanResult.plan.plan) {
                    if (isCancelledRef.current) break;
                    
                    const toolId = step.tool;
                    let toolInput = step.input || prompt;
                    
                    if (toolId === 'local_knowledge') {
                        updateThinkingMessage(`Durchsuche Wissensdatenbank: "${toolInput.substring(0, 40)}..."`);
                        const result = await toolRegistry.local_knowledge.execute(toolInput, { 
                            projectId: appState.activeProjectId || 'default', 
                            prompt,
                            currentProjectData: projectData
                        });
                        if (result.success) {
                            executionContext.localContext += (executionContext.localContext ? "\n\n" : "") + result.contextAddition;
                        }
                    } else if (toolId === 'web_search') {
                        let searchRetries = 0;
                        const maxSearchRetries = 2; // Reduced retries in ReAct loop for speed
                        const providerPool = [aiSettings.searchProvider || 'duckduckgo', 'brave'];
                        
                        while (searchRetries < maxSearchRetries) {
                            const currentProvider = providerPool[searchRetries];
                            updateThinkingMessage(`Recherche im Web (${currentProvider}): "${toolInput.substring(0, 30)}..."`);
                            
                            const result = await toolRegistry.web_search.execute(toolInput, { 
                                searchProvider: currentProvider,
                                projectToken: import.meta.env.VITE_PROJECT_TOKEN || (window as { VITE_PROJECT_TOKEN?: string }).VITE_PROJECT_TOKEN,
                                currentProjectData: projectData
                            });
                            
                            if (result.success && result.sources && result.sources.length > 0) {
                                executionContext.searchContext += (executionContext.searchContext ? "\n\n" : "") + result.contextAddition;
                                
                                // Deduplicate sources by URI
                                const newSources = result.sources.filter(ns => 
                                    !executionContext.sources.some(os => os.uri === ns.uri)
                                );
                                executionContext.sources = [...executionContext.sources, ...newSources];
                                break;
                            }
                            searchRetries++;
                        }
                    } else if (toolId === 'financial_architect') {
                        updateThinkingMessage('Optimiere Finanzstruktur...');
                        const result = await toolRegistry.financial_architect.execute('', { 
                            currentProjectData: projectData, 
                            calculations: calculations || undefined
                        });
                        if (result.contextAddition) {
                            executionContext.thinkingResults += result.contextAddition;
                        }
                    } else if (toolId === 'thinking') {
                        // Thinking is handled in the final generation usually, or as a pause
                        await new Promise(r => setTimeout(r, 400));
                    }
                }
            }
            
            // Final stabilization if max iterations reached
            if (iterationCount >= maxIterations && !isComplete) {
                updateThinkingMessage('Maximale Planungsschritte erreicht. Finalisiere Analyse...');
            }

            // Only fetch detailed slices if a data change is actually planned
            const activeSlices = (intent === 'DATA_CHANGE' || intent === 'ANALYSIS' || prompt.toLowerCase().includes('produkt') || prompt.toLowerCase().includes('kosten')) 
                ? detectRelevantSlices(prompt, view, historyForApiCall || chatHistory)
                : [];
            
            const contextData = buildOptimizedContext(projectData, activeSlices, calculations);
            
            // Provide schema ONLY if data change is the strategic intent
            const schemaToUse = (intent === 'DATA_CHANGE') 
                ? JSON.stringify(getProjectedSchema(activeSlices), null, 2)
                : null;
            const activePersona: AiPersona = allPersonas.find(p => p.id === aiSettings.selectedPersonaId) || personas[0] || ({} as AiPersona);
            
            let fileContext = "";
            if (uploadedFile?.textContent) {
                fileContext = `\n\n### AKTUELL GELADENE DATEI (${uploadedFile.name}):\n${uploadedFile.textContent}`;
            }
            
            const finalAugmentedPrompt = `BENUTZERANWEISUNG: "${prompt}"\n\n${executionContext.localContext}${executionContext.searchContext}${executionContext.thinkingResults}${fileContext}\n\nRELEVANTE PROJEKTDATEN:\n${JSON.stringify(contextData)}`;
            
            const personaContext = await toolRegistry.persona_manager.execute('', { 
                persona: activePersona,
                currentProjectData: projectData
            });
            const personaContextMsg = personaContext.message || "";
            
            // In ReAct mode, we usually keep thinking enabled for the final synthesis 
            // unless it's a very simple general query.
            const finalThinkingMode = intent !== 'GENERAL';
            
            const sysInstruction = getSystemPrompt(activePersona, schemaToUse, finalThinkingMode, chatMemory) + "\n\n" + personaContextMsg;

            const contextAtTime = {
                systemInstruction: sysInstruction,
                userPrompt: finalAugmentedPrompt,
                history: historyForOllama,
                activeSlices: activeSlices,
                plan: [{ tool: 'react_loop', input: prompt, reason: orchestratorReasoning }],
                thinkingModeActive: finalThinkingMode,
                originalProjectData: projectData // Store current project data for training export
            };

            updateThinkingMessage('Antwort wird generiert...');

            const apiMessages: AiMessage[] = [
                { role: 'system' as const, content: sysInstruction },
                ...historyForOllama.map(m => ({ 
                    role: m.role === 'model' ? 'assistant' as const : 'user' as const, 
                    content: m.content 
                })),
                { role: 'user' as const, content: finalAugmentedPrompt }
            ];

            abortControllerRef.current = new AbortController();
            const responseData = await callAi(aiSettings, apiMessages, abortControllerRef.current.signal);
            let fullResponseText = responseData.content;
            totalUsage = sumUsage(totalUsage, responseData.usage);

            if (fullResponseText.includes('modifiedData') && !isCancelledRef.current) {
                updateThinkingMessage('Führe Qualitätskontrolle durch...');
                const criticalReviewResult = await critic.review(fullResponseText, projectData, prompt);
                const criticalReview = criticalReviewResult.review;
                totalUsage = sumUsage(totalUsage, criticalReviewResult.usage);
                
                if (!criticalReview.isApproved) {
                    updateThinkingMessage('⚠️ Kritikpunkte identifiziert. Verfeinere Antwort...');
                    fullResponseText = `<thought>${criticalReview.critique}</thought>\n\n${fullResponseText}`;
                } else {
                    updateThinkingMessage('✅ Qualitätskontrolle bestanden');
                }
            }

            if (isCancelledRef.current) return;
            
            const turnChars = prompt.length + fullResponseText.length;
            sessionCharCountRef.current += turnChars;

            await processFinalResponse(fullResponseText, executionContext.sources.length > 0 ? executionContext.sources : undefined, contextAtTime, orchestratorReasoning, totalUsage);
            
            if (sessionCharCountRef.current > 50000) {
                setTimeout(async () => {
                   const newMemory = await summarizeHistory(chatHistory, chatMemory, aiSettings);
                   if (newMemory !== chatMemory) {
                       setChatMemory(newMemory);
                       sessionCharCountRef.current = 0;
                   }
                }, 1500);
            }

        } catch (error: unknown) {
            abortControllerRef.current = null;
            if (isCancelledRef.current) return;
            let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";
            if (error instanceof Error) {
                errorMessage = error.message;
                if (error.name === 'AbortError') errorMessage = "Anfrage abgebrochen.";
            } else {
                errorMessage = JSON.stringify(error);
            }
            
            setChatHistory(prev => {
                const newHistory = [...prev];
                const lastMessage = newHistory[newHistory.length - 1];
                if (lastMessage?.role === 'model') {
                lastMessage.role = 'error'; 
                lastMessage.content = errorMessage;
                lastMessage.updatedAt = new Date().toISOString();
            } else {
                newHistory.push(createMessage('error', errorMessage));
            }
                return newHistory;
            });
        } finally {
            setIsLoading(false);
            setUploadedFile(null);
        }
    };

    const handleSendMessage = async (e: React.FormEvent, prompt: string) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        
        const currentHistory = chatHistory.filter(m => !m.continueAction);
        const newUserMsg = createMessage('user', prompt, { rawContent: prompt });
        setChatHistory([...currentHistory, newUserMsg]);
        await performAiRequest(prompt, currentHistory);
    };

    const handleContinueChat = async () => {
        const continuationPrompt = "Lies den bisherigen Chatverlauf, um dich an den Kontext zu erinnern, und fahre dann mit dem Gespräch fort, indem du eine passende nächste Antwort gibst oder eine relevante Frage stellst.";
        const historyForApiCall = chatHistory.filter(m => !m.continueAction);
        
        setChatHistory([...historyForApiCall, createMessage('user', continuationPrompt, { rawContent: continuationPrompt })]);
        await performAiRequest(continuationPrompt, historyForApiCall);
    };

    const handleQuickActionClick = (prompt: string) => {
        const currentHistory = chatHistory.filter(m => !m.continueAction);
        setChatHistory([...currentHistory, createMessage('user', prompt)]);
        performAiRequest(prompt, currentHistory);
    };

    const handleKbChoice = async (fileName: string, permanent: boolean) => {
        if (!pendingFile || pendingFile.file.name !== fileName) return;
        
        setIsIngesting(true);
        const now = new Date().toISOString();
        try {
            if (permanent) {
                const result = await vectorService.uploadFile(appState.activeProjectId || 'default', pendingFile.file);
                setChatHistory(prev => [...prev.filter(m => !m.kbChoiceAction), {
                    id: uuidv4(),
                    role: 'model',
                    content: `<div class="ai-info-box">Dokument <strong>${fileName}</strong> wurde dauerhaft gespeichert (${result.chunks} Abschnitte).</div>`,
                    createdAt: now,
                    updatedAt: now
                }]);
            } else {
                const result = await vectorService.parseFile(pendingFile.file);
                setUploadedFile({ name: fileName, textContent: result.text });
                setChatHistory(prev => [...prev.filter(m => !m.kbChoiceAction), {
                    id: uuidv4(),
                    role: 'model',
                    content: `<div class="ai-info-box">Dokument <strong>${fileName}</strong> wurde für diesen Chat geladen (nicht gespeichert).</div>`,
                    createdAt: now,
                    updatedAt: now
                }]);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler beim Dokument-Piping";
            alert("Fehler: " + errorMessage);
        } finally {
            setIsIngesting(false);
            setPendingFile(null);
        }
    };

    const handleFileChange = async (file: File) => {
        const pendingId = uuidv4();
        setPendingFile({ file, id: pendingId });
        const now = new Date().toISOString();
        
        setChatHistory(prev => [...prev, {
            id: uuidv4(),
            role: 'model',
            content: `Datei erkannt: **${file.name}**\n\nSoll dieses Dokument dauerhaft in die lokale Wissensdatenbank aufgenommen werden?`,
            createdAt: now,
            updatedAt: now,
            kbChoiceAction: {
                fileName: file.name,
                pendingId: pendingId
            }
        }]);
    };

    const handleSaveChat = () => {
        if (!chatHistory || chatHistory.length === 0 || isChatSaved) return;
        const now = new Date();
        const firstUserMessage = chatHistory.find(m => m.role === 'user')?.content.substring(0, 30) || 'Chat';
        
        const newSavedChat: SavedChat = {
          id: uuidv4(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          timestamp: now.toISOString(),
          name: `(${now.toLocaleDateString('de-DE')}) ${firstUserMessage}...`,
          history: chatHistory.filter(m => !m.continueAction)
        };

        let currentSavedChats = [...savedChats];
        currentSavedChats.push(newSavedChat);
        currentSavedChats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onDataChange({ savedChats: currentSavedChats });
    };

    const handleLoadChat = (id: string) => {
        setSelectedChatId(id);
        const chatToLoad = savedChats.find(c => c.id === id);
        if (chatToLoad) {
            const historyWithAction = [...chatToLoad.history];
            if (!historyWithAction[historyWithAction.length - 1]?.continueAction) {
                const now = new Date().toISOString();
                historyWithAction.push({
                    id: uuidv4(),
                    role: 'model',
                    content: '',
                    createdAt: now,
                    updatedAt: now,
                    continueAction: true,
                });
            }
            setChatHistory(historyWithAction);
        }
    };

    const handleResetChat = () => {
        setChatHistory([]);
        setUploadedFile(null);
        setSelectedChatId('');
        setForcedTools(new Set());
    };

    const handleMessageFeedback = (index: number, feedback: 'positive' | 'negative', reason?: string) => {
        setChatHistory(prev => {
            const newHistory = [...prev];
            if (newHistory[index]) {
                if (newHistory[index].feedback === feedback && !reason) {
                    delete newHistory[index].feedback;
                    delete newHistory[index].feedbackReason;
                } else {
                    newHistory[index].feedback = feedback;
                    if (reason !== undefined) newHistory[index].feedbackReason = reason;
                }
            }
            return newHistory;
        });
    };

    const handleManualMemoryRefresh = async () => {
        setIsLoading(true);
        const now = new Date().toISOString();
        const refreshMsgId = uuidv4();
        
        setChatHistory(prev => [...prev, {
            id: refreshMsgId,
            role: 'model',
            content: `<div class="ai-thinking-step"><span class="ai-thinking-spinner"></span> Langzeitgedächtnis wird aktualisiert...</div>`,
            createdAt: now,
            updatedAt: now
        }]);

        try {
            const newMemory = await summarizeHistory(chatHistory, chatMemory, aiSettings);
            if (newMemory !== chatMemory) {
                setChatMemory(newMemory);
                sessionCharCountRef.current = 0;
            }
            
            setChatHistory(prev => {
                const newHistory = [...prev];
                const msgIndex = newHistory.findIndex(m => m.id === refreshMsgId);
                if (msgIndex !== -1) {
                    newHistory[msgIndex] = {
                        ...newHistory[msgIndex],
                        content: `<div class="ai-info-box">
                            <p><strong>✅ Langzeitgedächtnis aktualisiert</strong></p>
                            <p>Aktueller Fokus:</p>
                            <div class="ai-memory-content">${simpleMarkdownToHtml(newMemory || "Noch kein Inhalt vorhanden.")}</div>
                        </div>`,
                        updatedAt: new Date().toISOString()
                    };
                }
                return newHistory;
            });
        } catch (err) {
             setChatHistory(prev => {
                const newHistory = [...prev];
                const msgIndex = newHistory.findIndex(m => m.id === refreshMsgId);
                if (msgIndex !== -1) {
                    newHistory[msgIndex] = {
                        ...newHistory[msgIndex],
                        role: 'error',
                        content: `Fehler beim Aktualisieren des Gedächtnisses: ${err instanceof Error ? err.message : String(err)}`,
                        updatedAt: new Date().toISOString()
                    };
                }
                return newHistory;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReview = (finalData: FinancialData, isNewProject: boolean = false) => {
        if (isNewProject) {
            handleNewProjectFromData(finalData);
        } else {
            onDataChange(finalData);
        }
        setReviewProposal(null);
        setChatHistory(prev => {
            const now = new Date().toISOString();
            return prev.map(m => {
                if (m.changeProposal) {
                    return {
                        ...m,
                        content: m.content + `<div class="ai-applied-badge">✅ Daten wurden nach Review erfolgreich übernommen.</div>`,
                        changeProposal: undefined,
                        changeDiff: undefined,
                        actionConfirmation: undefined,
                        updatedAt: now
                    };
                }
                return m;
            });
        });
    };

    const handleCancelChanges = (messageIndex: number) => {
        setChatHistory(prev => {
            const newHistory = [...prev];
            const msg = newHistory[messageIndex];
            if (msg) {
                delete msg.changeProposal;
                delete msg.changeDiff;
                delete msg.actionConfirmation;
            }
            return newHistory;
        });
        setChatHistory(prev => {
            const now = new Date().toISOString();
            return [...prev, { 
                id: uuidv4(),
                role: 'model', 
                content: "Vorschlag verworfen. Soll ich eine andere Lösung suchen oder kann ich anderweitig helfen?", 
                createdAt: now,
                updatedAt: now
            }];
        });
    };

    const handleExportTrainingData = () => {
        const trainingData = chatHistory
            .filter(m => m.feedback)
            .map(m => ({
                instruction: m.contextAtTime?.systemInstruction,
                input: m.contextAtTime?.userPrompt,
                history: m.contextAtTime?.history,
                thought: m.thought,
                output: m.content,
                rawOutput: m.rawContent,
                proposedData: m.changeProposal,
                originalData: m.contextAtTime?.originalProjectData,
                diff: m.changeDiff,
                feedback: m.feedback,
                reason: m.feedbackReason,
                createdAt: m.createdAt || m.timestamp || new Date().toISOString()
            }));

        if (trainingData.length === 0) return;

        const blob = new Blob([JSON.stringify(trainingData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `louis_ai_training_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return {
        chatHistory,
        isLoading,
        uploadedFile,
        forcedTools,
        isIngesting,
        chatMemory,
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
    };
};
