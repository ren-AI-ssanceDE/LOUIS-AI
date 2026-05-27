/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { ChatMessage, AiSettings, TokenUsage } from '../types.ts';
import { GoogleGenAI } from '@google/genai';

/**
 * Result structure for AI calls including token usage.
 */
export interface AiResponse {
    content: string;
    usage?: TokenUsage;
}

/**
 * Generic interface for AI message format used within the app (similar to OpenAI/Ollama)
 */
export interface AiMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const handleProviderError = async (response: Response, providerName: string) => {
    let errorMessage = `API Error (${providerName}): ${response.status} ${response.statusText}`;
    try {
        const err = await response.json();
        if (response.status === 429) {
            errorMessage = `${providerName} Quotenlimit erreicht (429). Ihr API-Guthaben ist möglicherweise aufgebraucht oder Sie senden zu viele Anfragen in kurzer Zeit.`;
        } else {
            errorMessage = `${providerName} API Fehler: ${err.error?.message || err.message || JSON.stringify(err)}`;
        }
    } catch (e) {
        // Fallback if not JSON
    }
    throw new Error(errorMessage);
};

export const callOllamaApi = async (url: string, body: unknown, signal?: AbortSignal) => {
    const isOllamaLocal = url.includes('localhost') || url.includes('127.0.0.1');
    const isHttps = window.location.protocol === 'https:';
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const projectToken = import.meta.env.VITE_PROJECT_TOKEN || (window as { VITE_PROJECT_TOKEN?: string }).VITE_PROJECT_TOKEN;
    if (projectToken) {
        headers['x-project-token'] = projectToken;
    }

    if (isOllamaLocal && isHttps) {
        const proxyUrl = new URL('/api/proxy/ollama', window.location.origin);
        return await fetch(proxyUrl.toString(), {
            method: 'POST',
            headers,
            body: JSON.stringify({ url, body }),
            signal
        });
    }

    return await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
    });
};

export const callAi = async (settings: AiSettings, messages: AiMessage[], signal?: AbortSignal): Promise<AiResponse> => {
    const provider = settings.provider || 'ollama';
    const model = settings.model || (provider === 'ollama' ? 'qwen2.5:14b' : (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'));

    switch (provider) {
        case 'gemini':
            return await callGemini(settings.apiKeyGemini || '', model, messages, settings, signal);
        case 'openai':
            return await callOpenAI(settings.apiKeyOpenAI || '', model, messages, settings, signal);
        case 'claude':
            return await callClaude(settings.apiKeyClaude || '', model, messages, settings, signal);
        case 'ollama':
        default:
            const body = {
                model: model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: false,
                options: {
                    temperature: settings.temperature ?? 0.2,
                    top_k: settings.topK ?? 30,
                    top_p: settings.topP ?? 0.4,
                    num_ctx: settings.numCtx || 125000,
                    num_predict: settings.numPredict || 32000
                }
            };
            const response = await callOllamaApi(settings.ollamaUrl || 'http://localhost:11434/api/chat', body, signal);
            if (!response.ok) throw new Error(`Ollama API Error: ${response.status}`);
            const result = await response.json() as { 
                message?: { content: string }; 
                response?: string;
                prompt_eval_count?: number;
                eval_count?: number;
            };
            
            const content = result.message?.content || result.response || '';
            const usage: TokenUsage | undefined = (result.prompt_eval_count !== undefined && result.eval_count !== undefined) ? {
                promptTokens: result.prompt_eval_count,
                completionTokens: result.eval_count,
                totalTokens: result.prompt_eval_count + result.eval_count
            } : undefined;

            return { content, usage };
    }
};

export const fetchGeminiModels = async (apiKey: string) => {
    if (!apiKey) return [];
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const proxyUrl = new URL('/api/proxy/generic', window.location.origin);
        proxyUrl.searchParams.append('url', url);
        
        const response = await fetch(proxyUrl.toString());
        if (!response.ok) return [];
        const data = await response.json() as { models?: { supportedGenerationMethods: string[]; name: string }[] };
        return (data.models || [])
            .filter(m => m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('vision'))
            .map(m => m.name.replace('models/', ''));
    } catch (error) {
        console.error("Error fetching Gemini models:", error);
        return [];
    }
};

export const fetchOpenAIModels = async (apiKey: string) => {
    if (!apiKey) return [];
    try {
        const url = 'https://api.openai.com/v1/models';
        const proxyUrl = new URL('/api/proxy/generic', window.location.origin);
        proxyUrl.searchParams.append('url', url);
        proxyUrl.searchParams.append('headers', JSON.stringify({ 
            'Authorization': `Bearer ${apiKey}` 
        }));

        const response = await fetch(proxyUrl.toString());
        if (!response.ok) return [];
        const data = await response.json() as { data?: { id: string }[] };
        return (data.data || [])
            .filter(m => m.id.startsWith('gpt') || m.id.startsWith('o1'))
            .map(m => m.id)
            .sort();
    } catch (error) {
        console.error("Error fetching OpenAI models:", error);
        return [];
    }
};

export const fetchClaudeModels = async (apiKey: string) => {
    if (!apiKey) return [];
    try {
        const url = 'https://api.anthropic.com/v1/models';
        const proxyUrl = new URL('/api/proxy/generic', window.location.origin);
        proxyUrl.searchParams.append('url', url);
        proxyUrl.searchParams.append('headers', JSON.stringify({ 
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        }));

        const response = await fetch(proxyUrl.toString());
        if (!response.ok) return [];
        const data = await response.json() as { data?: { id: string }[] };
        return (data.data || []).map(m => m.id).sort();
    } catch (error) {
        console.error("Error fetching Claude models:", error);
        return [];
    }
};

export const fetchOllamaModels = async (baseUrl: string) => {
    try {
        const url = new URL('/api/tags', baseUrl).toString();
        
        // Use proxy if needed (mixed content workaround)
        const isOllamaLocal = url.includes('localhost') || url.includes('127.0.0.1');
        const isHttps = window.location.protocol === 'https:';
        
        let response;
        if (isOllamaLocal && isHttps) {
            // Note: If running in a cloud environment, the server-side proxy
            // cannot reach the user's actual 'localhost'.
            // However, we use /api/proxy/generic here to at least use the correct proxy logic.
            const proxyUrl = new URL('/api/proxy/generic', window.location.origin);
            proxyUrl.searchParams.append('url', url);
            response = await fetch(proxyUrl.toString());
        } else {
            response = await fetch(url);
        }

        if (!response.ok) {
            console.warn(`Ollama models fetch failed with status ${response.status}`);
            return [];
        }
        const data = await response.json() as { models?: { name: string }[] };
        return (data.models || []).map(m => m.name);
    } catch (error) {
        console.error("Error fetching Ollama models:", error);
        return [];
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callGemini = async (apiKey: string, model: string, messages: AiMessage[], settings: AiSettings, signal?: AbortSignal): Promise<AiResponse> => {
    if (!apiKey) throw new Error("Gemini API Key fehlt.");
        let lastError: Error | null = null;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal?.aborted) throw new Error("Abgebrochen");
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            const systemInstruction = messages.find(m => m.role === 'system')?.content;
            
            const history = messages.filter(m => m.role !== 'system').slice(0, -1).map(m => ({
                role: m.role === 'user' ? 'user' : 'model' as const,
                parts: [{ text: m.content }]
            }));
            const lastUserMsg = messages[messages.length - 1].content;

            const chat = ai.chats.create({
                model: model,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: settings.temperature,
                    topK: settings.topK,
                    topP: settings.topP,
                    maxOutputTokens: settings.numPredict,
                },
                history: history
            });

            const result = await chat.sendMessage({ message: lastUserMsg });
            const content = result.text || "";
            
            // Extract usage metadata if available
            const usageMeta = (result as any).usageMetadata;
            const usage: TokenUsage | undefined = usageMeta ? {
                promptTokens: usageMeta.promptTokenCount || 0,
                completionTokens: usageMeta.candidatesTokenCount || 0,
                totalTokens: usageMeta.totalTokenCount || 0
            } : undefined;

            return { content, usage };
        } catch (error: unknown) {
            const err = error as Error;
            lastError = err;
            const errorMsg = err.message || '';
            const isQuotaError = errorMsg.includes('429') || 
                                errorMsg.includes('QUOTA_EXHAUSTED') || 
                                errorMsg.includes('Resource has been exhausted');
            
            if (isQuotaError && attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                console.warn(`Gemini 429/Quota error. Retry attempt ${attempt + 1}/${maxRetries} in ${waitTime}ms...`);
                await sleep(waitTime);
                continue;
            }
            
            // If not a quota error or out of retries, break loop and throw
            break;
        }
    }

    if (lastError) {
        console.error("Gemini call failed after retries:", lastError);
        if (lastError.message?.includes('429') || lastError.message?.includes('QUOTA_EXHAUSTED') || lastError.message?.includes('Resource has been exhausted')) {
            throw new Error("Gemini Quotenlimit erreicht (429). Ihr API-Guthaben ist aufgebraucht oder Sie nutzen einen Free-Tier Key zu intensiv. (Alle Versuche fehlgeschlagen)");
        }
        throw new Error(`Gemini Fehler: ${lastError.message || 'Unbekannter Fehler'}`);
    }
    throw new Error("Unbekannter Fehler bei Gemini API-Aufruf.");
};


export const callOpenAiApi = async (baseUrl: string, body: unknown, apiKey?: string, signal?: AbortSignal) => {
    const isHttps = window.location.protocol === 'https:';
    const isBaseUrlHttps = baseUrl.startsWith('https:');
    
    // We must proxy if we are on HTTPS and the target is HTTP (Mixed Content)
    // Or if it's a local address and we are on a remote server/preview
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('192.168.') || baseUrl.includes('10.');
    const needsProxy = (isHttps && !isBaseUrlHttps) || (isLocal && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'));

    let finalUrl = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
    if (!baseUrl.startsWith('http')) {
        finalUrl = `https://api.openai.com/v1/chat/completions`;
    }

    const headers: Record<string, string> = { 
        'Content-Type': 'application/json'
    };
    
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const projectToken = import.meta.env.VITE_PROJECT_TOKEN || (window as { VITE_PROJECT_TOKEN?: string }).VITE_PROJECT_TOKEN;
    if (projectToken) {
        headers['x-project-token'] = projectToken;
    }

    // Proxy if needed
    if (needsProxy) {
        return await fetch('/api/proxy/generic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: finalUrl,
                body,
                headers: { 'Authorization': `Bearer ${apiKey}` }
            }),
            signal
        });
    }

    return await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
    });
};

const callOpenAI = async (apiKey: string, model: string, messages: AiMessage[], settings: AiSettings, signal?: AbortSignal): Promise<AiResponse> => {
    // If we have a custom base URL (e.g. for vLLM), use it. Otherwise use the default.
    const baseUrl = settings.openAiBaseUrl || 'https://api.openai.com/v1';
    
    const body = {
        model: model,
        messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content })),
        temperature: settings.temperature,
        top_p: settings.topP,
        max_tokens: settings.numPredict,
        stream: false
    };

    const response = await callOpenAiApi(baseUrl, body, apiKey, signal);

    if (!response.ok) {
        await handleProviderError(response, 'OpenAI/vLLM');
    }
    const result = await response.json() as { 
        choices?: { message?: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
    };
    
    const content = result.choices?.[0]?.message?.content || '';
    const usage: TokenUsage | undefined = result.usage ? {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
    } : undefined;

    return { content, usage };
};

const callClaude = async (apiKey: string, model: string, messages: AiMessage[], settings: AiSettings, signal?: AbortSignal): Promise<AiResponse> => {
    if (!apiKey) throw new Error("Claude API Key fehlt.");
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true' // Claude generally requires proxy from browser
        },
        body: JSON.stringify({
            model: model,
            system: systemInstruction,
            messages: filteredMessages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: settings.numPredict || 4096,
            temperature: settings.temperature,
            stream: false
        }),
        signal
    });

    if (!response.ok) {
        await handleProviderError(response, 'Claude');
    }
    const result = await response.json() as { 
        content?: { text: string }[];
        usage?: { input_tokens: number; output_tokens: number; };
    };
    
    const content = result.content?.[0]?.text || '';
    const usage: TokenUsage | undefined = result.usage ? {
        promptTokens: result.usage.input_tokens,
        completionTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens
    } : undefined;

    return { content, usage };
};

export const summarizeHistory = async (
    history: ChatMessage[], 
    chatMemory: string | null,
    settings: AiSettings
): Promise<string | null> => {
    if (history.length < 3) return chatMemory;
    
    const bufferSize = history.length > 10 ? 6 : 2;
    const messagesToSummarize = history.slice(0, -bufferSize);
    
    if (messagesToSummarize.length === 0) return chatMemory;

    const historyText = messagesToSummarize.map(m => `${m.role === 'user' ? 'Benutzer' : 'Assistent'}: ${m.rawContent || m.content}`).join('\n\n');
    
    const summaryPrompt = `Aktualisiere das Langzeitgedächtnis basierend auf den neuen Nachrichten. 
Bisheriges Gedächtnis: ${chatMemory || 'Leer'}

Neue Nachrichten zum Integrieren:
${historyText}

Erstelle ein kompaktes, strukturiertes Gedächtnisprotokoll (Summary Buffer). 
Behalte alle wichtigen Fakten bei:
- Geänderte Finanzdaten oder Projektparameter
- Spezifische Anweisungen des Benutzers
- Offene To-Dos oder Fragen

Antworte NUR mit dem neuen Gedächtnistext.`;

    try {
        const responseData = await callAi(settings, [
            { role: 'system', content: 'Du bist ein Sekretär, der ein Gedächtnisprotokoll erstellt.' },
            { role: 'user', content: `Hier ist der Verlauf:\n\n${historyText}\n\n${summaryPrompt}` }
        ]);
        return responseData.content || chatMemory;
    } catch (err: unknown) {
        console.error("Fehler beim Erstellen des Gedächtnisprotokolls:", err instanceof Error ? err.message : err);
    }
    return chatMemory;
};
