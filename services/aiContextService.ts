/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { FinancialData, OpCostCategoryKey, ViewType, ChatMessage, CalculationResults, YearData } from '../types.ts';
import { aiFinancialDataSchema, Type } from '../components/ai/schema.ts';

export type ContextSlice = 'settings' | 'products' | 'sales' | 'privateNeeds' | 'financing' | 'assets' | 'startupCosts' | 'operationalCosts';

/**
 * Industry Standard: Semantic Context Selection
 * Detects which parts of the financial data are relevant to the user request.
 */
export const detectRelevantSlices = (prompt: string, currentView: ViewType, history: ChatMessage[] = []): ContextSlice[] => {
    const slices: Set<ContextSlice> = new Set(['settings']); // Settings are usually small and important

    const keywords: Record<ContextSlice, string[]> = {
        settings: ['titel', 'name', 'datum', 'jahr', 'planung', 'stammdaten', 'firma', 'einstellungen', 'projekt', 'basis', 'unternehmensname', 'rechtsform', 'gründungsdatum'],
        products: ['produkt', 'leistung', 'preis', 'angebot', 'sortiment', 'marge', 'kosten', 'ust', 'artikel', 'dienstleistung', 'tarif', 'verkaufspreis', 'stundensatz', 'honorarsatz', 'tagessatz', 'berater', 'coaching', 'service'],
        sales: ['absatz', 'verkauf', 'menge', 'umsatz', 'entwicklung', 'trend', 'stück', 'einheiten', 'prognose', 'wachstum', 'marktanteil', 'skalierung', 'verkaufszahlen'],
        privateNeeds: ['privat', 'bedarf', 'entnahme', 'haushalt', 'lebensunterhalt', 'krankenversicherung', 'miete privat', 'versicherungen privat', 'vorsorge', 'lebenshaltungskosten', 'miete', 'lebensmittel'],
        financing: ['finanzierung', 'kredit', 'darlehen', 'eigenkapital', 'fremdkapital', 'zins', 'tilgung', 'förderung', 'investor', 'bank', 'darlehenssumme', 'kapitalbedarf', 'fördermittel'],
        assets: ['investition', 'anlage', 'maschine', 'computer', 'auto', 'büroausstattung', 'anschaffung', 'afa', 'abschreibung', 'inventar', 'hardware', 'software', 'laptop', 'ausstattung'],
        startupCosts: ['gründung', 'start', 'beratung', 'notar', 'anmeldung', 'kaution', 'eröffnung', 'gebühren', 'eintragung', 'anlaufkosten', 'gründungskosten', 'setup'],
        operationalCosts: ['betrieb', 'kosten', 'miete', 'personal', 'gehalt', 'marketing', 'werbung', 'reise', 'versicherung', 'beratung', 'strom', 'internet', 'telefon', 'softwareabo', 'fixkosten', 'ausgaben', 'betriebskosten']
    };

    const lowercasePrompt = prompt.toLowerCase();
    
    // Check if the query is business/finance related at all
    const financeRelKeywords = ['geld', 'kapital', 'finanz', 'plan', 'buchhaltung', 'steuer', 'gewinn', 'verlust', 'kosten', 'umsatz', 'invest', 'kredit', 'darlehen', 'produkt', 'preis', 'absatz', 'markt', 'wettbewerb', 'unternehmen', 'firma', 'gründung', 'liquidität', 'cashflow', 'rendite', 'marge', 'ebit', 'bilanz', 'euro', '€', 'dollar', '$', '%', 'prozent'];
    const isFinanceRelated = financeRelKeywords.some(key => lowercasePrompt.includes(key));

    // Also check the last user message in history if current prompt is very short (e.g., "Ja", "Ok", "Mach das")
    let combinedText = lowercasePrompt;
    if (lowercasePrompt.length < 15 && history.length > 0) {
        const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            combinedText += " " + lastUserMsg.content.toLowerCase();
        }
    }

    const isExplicitToolRequest = combinedText.includes('suche') || combinedText.includes('google') || combinedText.includes('internet') || combinedText.includes('web') || combinedText.includes('wissensdatenbank') || combinedText.includes('dokumene');

    // 1. Keyword based activation
    (Object.entries(keywords) as [ContextSlice, string[]][]).forEach(([slice, words]) => {
        if (words.some(word => combinedText.includes(word))) {
            slices.add(slice);
        }
    });

    // 2. View based activation (contextual bias)
    switch (currentView) {
        case 'basicSettings': slices.add('settings'); break;
        case 'productPricing': slices.add('products'); break;
        case 'salesPlan': slices.add('products'); slices.add('sales'); break;
        case 'privateDemand': slices.add('privateNeeds'); break;
        case 'financingPlan': slices.add('financing'); break;
        case 'depreciationPlan': slices.add('assets'); break;
        case 'liquidityPlan':
        case 'earningsPlan':
        case 'overview':
            // Overviews need shallow summary data usually
            break;
    }

    // 3. Dependencies & Minimum Context
    if (slices.has('sales')) slices.add('products'); // Sales need product names/IDs
    
    // Only add default context if the query is actually about the project or tools are requested
    if (slices.size === 1 && slices.has('settings')) {
        if (isFinanceRelated || (isExplicitToolRequest && prompt.length > 30)) {
            slices.add('products');
            slices.add('operationalCosts');
        }
    }

    return Array.from(slices);
};

/**
 * Creates a "Slim" version of a section to provide context without high token cost.
 */
const getSlimSection = (slice: ContextSlice, data: FinancialData) => {
    switch (slice) {
        case 'products':
            const products = data.products || [];
            return {
                info: `${products.length} Produkte`,
                topItems: products.slice(0, 5).map(p => `${p.name} (${p.targetPrice}€)`).join(', '),
                avgMargin: products.length > 0 ? (products.reduce((s, p) => s + (p.marginPercentage || 0), 0) / products.length).toFixed(1) + '%' : '0%'
            };
        case 'privateNeeds':
            let pnMonthly = 0;
            const items = data.privateNeeds || [];
            items.forEach(item => {
                // If Month 3 exists, take it as recurring proxy, else Month 1
                const mIdx = (item.directCosts?.[0]?.[2] !== undefined) ? 2 : 0;
                pnMonthly += (item.directCosts?.[0]?.[mIdx] || 0);
                (item.subItems || []).forEach(si => {
                    const siMIdx = (si.costs?.[0]?.[2] !== undefined) ? 2 : 0;
                    pnMonthly += (si.costs?.[0]?.[siMIdx] || 0);
                });
            });
            return { monthlyTotal: Math.round(pnMonthly) + "€" };
        case 'financing':
            return { 
                equity: (data.financing || []).filter(f => f.type === 'equity').reduce((s, f) => s + f.amount, 0),
                debt: (data.financing || []).filter(f => f.type === 'debt').reduce((s, f) => s + f.amount, 0),
                total: (data.financing || []).reduce((s, f) => s + f.amount, 0)
            };
        case 'assets':
            return { 
                count: (data.assets || []).length, 
                totalValue: (data.assets || []).reduce((s, a) => s + a.purchasePrice, 0) 
            };
        case 'operationalCosts':
            let recurringMonthly = 0;
            let oneTimeMonth1 = 0;
            (Object.keys(data.operationalCosts || {}) as OpCostCategoryKey[]).forEach(key => {
                const cat = data.operationalCosts[key];
                if (cat) {
                    // Operational costs analysis
                    // Month 1 often contains startup peaks. Month 3-12 are usually stable.
                    const month1 = (cat.directCosts?.[0]?.[0] || 0);
                    const month3 = (cat.directCosts?.[0]?.[2] !== undefined) ? (cat.directCosts[0][2] || 0) : month1;
                    
                    if (month1 > month3 * 1.2 && month1 > 100) {
                        oneTimeMonth1 += (month1 - month3);
                        recurringMonthly += month3;
                    } else {
                        recurringMonthly += month3;
                    }
                    
                    (cat.subItems || []).forEach(si => {
                        const m1 = si.costs?.[0]?.[0] || 0;
                        const m3 = (si.costs?.[0]?.[2] !== undefined) ? (si.costs[0][2] || 0) : m1;
                        if (m1 > m3 * 1.2 && m1 > 100) {
                            oneTimeMonth1 += (m1 - m3);
                            recurringMonthly += m3;
                        } else {
                            recurringMonthly += m3;
                        }
                    });
                }
            });
            return { 
                estimatedStableMonthlyCosts: Math.round(recurringMonthly) + "€",
                oneTimeStartupPeaksInMonth1: Math.round(oneTimeMonth1) + "€"
            };
        default:
            return undefined;
    }
};

/**
 * Builds the optimized context data for the LLM
 */
export const buildOptimizedContext = (data: FinancialData, activeSlices: ContextSlice[], calcs: CalculationResults | null) => {
    const isSoleProprietor = data.settings.legalForm === 'Gewerbe (Einzelunternehmen)' || data.settings.legalForm === 'Freiberufliche Selbstständigkeit';
    const context: Record<string, unknown> = {
        settings: data.settings,
        _contextNote: `Detailierte Daten wurden nur für folgende Bereiche bereitgestellt: ${activeSlices.join(', ')}. Andere Bereiche sind zusammengefasst.`,
        _legalFormRule: isSoleProprietor ? "RECHTLICHER HINWEIS: Da es sich um ein Einzelunternehmen/Freiberufler handelt, gibt es KEINE 'managementSalary' (Geschäftsführungsgehälter). Alle Entnahmen des Gründers erfolgen über 'privateNeeds' (Privatbedarf/Privatentnahme). Die Zeile 'managementSalary' in 'operationalCosts' wird mathematisch ignoriert und in der UI ausgeblendet." : undefined
    };

    const allSlices: ContextSlice[] = ['products', 'sales', 'privateNeeds', 'financing', 'assets', 'startupCosts', 'operationalCosts'];

    allSlices.forEach(slice => {
        if (activeSlices.includes(slice)) {
            // Include full data for active slices
            if (slice === 'sales') {
                // Transform to array format the AI expects
                context[slice] = Object.entries(data.sales).map(([productId, yearlySales]) => ({ productId, yearlySales }));
            } else {
                context[slice] = data[slice];
            }
        } else {
            // Include slim data for context
            const slim = getSlimSection(slice, data);
            if (slim) context[slice + '_summary'] = slim;
        }
    });

    // Always include a high-level calculation summary
    if (calcs) {
        context.calculationSummary = {
            yearly: calcs.yearly?.map((y: YearData, index: number) => ({
                year: index + 1,
                revenue: y.revenue,
                operationalCosts: y.operationalCosts,
                profitBeforeTax: y.profitBeforeTax,
                isProfitable: y.profitBeforeTax > 0
            })),
            totalProfit: calcs.totalOverview?.totalProfit
        };
    }

    return context;
};

/**
 * Prunes the JSON schema to only include definitions for active slices.
 * This significantly reduces input tokens.
 */
export const getProjectedSchema = (activeSlices: ContextSlice[]) => {
    const projectedSchema = {
        type: Type.OBJECT,
        description: "Enthält die Finanzdaten für " + activeSlices.join(", "),
        properties: { ...aiFinancialDataSchema.properties } as Record<string, unknown>,
        required: aiFinancialDataSchema.required.filter(r => activeSlices.includes(r as ContextSlice) || r === 'settings')
    };

    // Remove properties not in active slices to save tokens
    Object.keys(projectedSchema.properties).forEach(key => {
        if (!activeSlices.includes(key as ContextSlice) && key !== 'settings') {
            delete projectedSchema.properties[key];
        }
    });

    return projectedSchema;
};
