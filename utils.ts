/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */


import { v4 as uuidv4 } from 'uuid';
import i18n from './i18n';

// --- HELPERS ---
export const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return i18n.language === 'de' ? '0,00' : '0.00';
    }
    const locale = i18n.language === 'en' ? 'en-US' : 'de-DE';
    return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatPercentage = (value: number) => {
    const val = value || 0;
    const locale = i18n.language === 'en' ? 'en-US' : 'de-DE';
    return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
};

export const formatMonths = (months: number) => {
    if (months <= 0) return i18n.t('common.not_available');
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    let result = '';
    
    if (years > 0) {
        result += i18n.t('stats.investoren.kpi.years_short', { count: years, defaultValue: `${years} J.` }) + ' ';
    }
    if (remainingMonths > 0) {
        result += i18n.t('common.months_short', { count: remainingMonths, defaultValue: `${remainingMonths} M.` });
    }
    return result.trim();
};

export const createYearlyArray = (years: number, value: unknown = 0) => Array(years).fill(null).map(() => Array(12).fill(value));

export const formatNumberForInput = (num: number | undefined | null): string => {
    if (num === null || num === undefined || isNaN(num)) return '';
    const locale = i18n.language === 'en' ? 'en-US' : 'de-DE';
    return num.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export const parseNumberFromInput = (str: string): number => {
    const s = String(str ?? '').trim();
    if (s === '') return 0;
    if (s === '-') return NaN;

    let cleaned = s;
    if (i18n.language === 'en') {
        // En: comma as thousand, dot as decimal -> remove comma, keep dot
        cleaned = s.replace(/,/g, '');
    } else {
        // De: dot as thousand, comma as decimal -> remove dot, replace comma with dot
        cleaned = s.replace(/\./g, '').replace(/,/g, '.');
    }

    if (!/^-?\d*\.?\d*$/.test(cleaned)) {
        return NaN;
    }
    
    return Number(cleaned);
};


export const formatChartAxisLabel = (value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '0';
    }
    
    const locale = i18n.language === 'en' ? 'en-US' : 'de-DE';
    const billion = i18n.t('common.billion_short', { defaultValue: 'Mrd.' });
    const million = i18n.t('common.million_short', { defaultValue: 'Mio.' });
    const thousand = i18n.t('common.thousand_short', { defaultValue: 'Tsd.' });

    if (Math.abs(value) >= 1_000_000_000) {
        return (value / 1_000_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ' + billion;
    }
    if (Math.abs(value) >= 1_000_000) {
        return (value / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ' + million;
    }
    if (Math.abs(value) >= 1000) {
        return (value / 1000).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ' + thousand;
    }
    return value.toLocaleString(locale);
};

/**
 * Deeply clones an object
 */
export const deepClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Rounds all numbers in an object or array to 2 decimal places.
 */
export const roundNumbers = <T>(obj: T): T => {
    if (typeof obj === 'number') {
        return (Math.round((obj + Number.EPSILON) * 100) / 100) as unknown as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => roundNumbers(item)) as unknown as T;
    }
    if (typeof obj === 'object' && obj !== null) {
        const newObj: Record<string, unknown> = {};
        const sourceObj = obj as Record<string, unknown>;
        for (const key in sourceObj) {
            newObj[key] = roundNumbers(sourceObj[key]);
        }
        return newObj as unknown as T;
    }
    return obj;
};

/**
 * Deeply merges source into target.
 * Arrays of objects are merged by id or name if possible.
 */
export const deepMerge = <T extends object>(target: T, source: Partial<T> | Record<string, unknown>): T => {
    if (!source) return target;
    if (typeof source !== 'object' || source === null) return source as unknown as T;

    // If target is not an object, source wins
    if (typeof target !== 'object' || target === null) return source as unknown as T;

    const output = { ...target } as Record<string, unknown>;
    const sourceObj = source as Record<string, unknown>;

    Object.keys(sourceObj).forEach(key => {
        const sourceVal = sourceObj[key];
        const targetVal = (target as Record<string, unknown>)[key];

        if (Array.isArray(sourceVal)) {
            // Special handling for financial arrays of objects (products, financing, etc.)
            // We only want to merge if the items are objects with some kind of identity.
            // If they are arrays (like number[][]) or simple primitives, we usually want to replace or keep as is.
            if (Array.isArray(targetVal) && targetVal.length > 0 && typeof targetVal[0] === 'object' && targetVal[0] !== null && !Array.isArray(targetVal[0])) {
                const mergedArray = [...targetVal] as Record<string, unknown>[];
                sourceVal.forEach((newItem: unknown) => {
                    if (newItem && typeof newItem === 'object' && !Array.isArray(newItem)) {
                        const newItemObj = newItem as Record<string, unknown>;
                        // Match by ID if exists, otherwise by Name (case-insensitive) or category or source
                        let existingIdx = -1;
                        if (newItemObj.id !== undefined) {
                            existingIdx = mergedArray.findIndex((item) => item.id === newItemObj.id);
                        } else {
                            const matchKeys = ['name', 'category', 'source', 'label'];
                            for (const mk of matchKeys) {
                                if (newItemObj[mk]) {
                                    existingIdx = mergedArray.findIndex((item) => item[mk] && String(item[mk]).toLowerCase() === String(newItemObj[mk]).toLowerCase());
                                    if (existingIdx > -1) break;
                                }
                            }
                        }

                        if (existingIdx > -1) {
                            // Recursively merge the items
                            const mergedItem = deepMerge(mergedArray[existingIdx], newItemObj);
                            // Update timestamp if it's an entity change
                            if (typeof mergedItem === 'object' && mergedItem !== null && 'updatedAt' in mergedItem) {
                                (mergedItem as Record<string, unknown>).updatedAt = new Date().toISOString();
                            }
                            mergedArray[existingIdx] = mergedItem;
                        } else {
                            // Add new item
                            const itemToAdd = { ...newItemObj };
                            if (itemToAdd.id === undefined) {
                                itemToAdd.id = uuidv4();
                            }
                            // Set timestamps
                            if (typeof itemToAdd === 'object' && itemToAdd !== null) {
                                itemToAdd.createdAt = itemToAdd.createdAt || new Date().toISOString();
                                itemToAdd.updatedAt = itemToAdd.updatedAt || new Date().toISOString();
                            }
                            mergedArray.push(itemToAdd);
                        }
                    }
                });
                output[key] = mergedArray;
            } else {
                // For arrays of arrays (like direct_costs) or simple lists, we REPLACE with the source
                output[key] = sourceVal;
            }
        } else if (sourceVal !== null && typeof sourceVal === 'object') {
            if (targetVal !== null && typeof targetVal === 'object' && !Array.isArray(targetVal)) {
                output[key] = deepMerge(targetVal as object, sourceVal as object);
                // Update parent timestamp if it has one
                const currentOutput = output[key] as Record<string, unknown>;
                if (currentOutput && 'updatedAt' in currentOutput) {
                    currentOutput.updatedAt = new Date().toISOString();
                }
            } else {
                output[key] = sourceVal;
            }
        } else {
            output[key] = sourceVal;
        }
    });

    return output as unknown as T;
};

/**
 * Robustly extracts JSON from a string, handling markdown code blocks, 
 * conversational noise, comments, and common LLM formatting errors.
 */
export const extractJsonFromString = (text: string): string | null => {
    if (!text) return null;

    // 1. Try to find JSON in markdown code blocks first
    const markdownMatches = Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g));
    let candidates: string[] = [];
    
    if (markdownMatches.length > 0) {
        candidates = markdownMatches.map(m => m[1].trim());
    }
    
    // 2. If no markdown blocks or they seem incomplete, look for the outermost braces
    // This is a fallback and can be more extensive
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        candidates.push(text.substring(firstBrace, lastBrace + 1).trim());
    }

    if (candidates.length === 0) return null;

    const cleanAndRepairJson = (json: string) => {
        try {
            // Strip JS-style comments
            let stripped = json.replace(/\/\/.*$/gm, '');
            stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Remove conversational noise often found inside backticks (e.g. "Here is the result: { ... }")
            // We search for the first '{' and the last '}' within the string
            const start = stripped.indexOf('{');
            const end = stripped.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
                stripped = stripped.substring(start, end + 1);
            }

            // Basic cleanup of control characters that are strictly illegal in JSON strings
            // but we must be careful not to replace newlines/tabs outside of quotes.
            // A better way is to only fix strings, but for now let's just restore valid whitespace.
            let repaired = stripped;
            
            // We'll try to parse it first. If it fails, we do more aggressive repairs.
            try {
                JSON.parse(repaired);
                return repaired.trim();
            } catch (e) {
                // Remove dangling commas: [1, 2,] -> [1, 2]
                repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
                
                try {
                    JSON.parse(repaired);
                    return repaired.trim();
                } catch (ee) {
                    // Try to catch common LLM errors like unescaped newlines in multi-line strings
                    // We only do this if it still fails.
                    return repaired.trim();
                }
            }
        } catch (e) {
            return json;
        }
    };

    // Prioritize candidates containing key finance-app keywords
    const priorityKeywords = ['followUpResponse', 'modifiedData', 'plan', 'intent', 'reasoning'];
    for (const cand of candidates) {
        if (priorityKeywords.some(key => cand.includes(key))) {
            const cleaned = cleanAndRepairJson(cand);
            try {
                JSON.parse(cleaned);
                return cleaned;
            } catch (e) {
                // If it doesn't parse, we'll try the next candidate
                continue;
            }
        }
    }

    // Fallback to first candidate if priority ones fail
    if (candidates.length === 0) return null;
    return cleanAndRepairJson(candidates[0]);
};
