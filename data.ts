/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { createYearlyArray } from './utils.ts';
import type { FinancialData, AppState, Project, OpCostCategory, OpCostCategoryKey, CustomAiPrompt, AiSettings, ChatMessage } from './types.ts';

const defaultAiPrompts: CustomAiPrompt[] = [
    {
        id: 'prompt_default_1',
        name: 'Agentic: Markt- & Risikoanalyse',
        description: 'Führt eine Websuche nach Markttrends durch und gleicht diese mit dem internen Plan ab.',
        prompt: 'Führe eine Websuche nach aktuellen Markttrends in meiner Branche durch. Analysiere anschließend, ob meine Absatzplanung und Kostenstruktur im Vergleich zum Markt realistisch sind und identifiziere strategische Risiken.',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'prompt_default_2',
        name: 'Agentic: Struktur-Optimierung',
        description: 'Nutzt den Financial Architect für eine Tiefenprüfung der Konsistenz und schlägt Profitabilitäts-Hacks vor.',
        prompt: 'Nutze den Financial Architect, um meine aktuelle Finanzstruktur auf logische Fehler zu prüfen. Schlage mir danach drei agentische Maßnahmen vor, um die Profitabilität durch Kosten-Synergien oder Preishebel zu steigern.',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'prompt_default_3',
        name: 'Agentic: Skalierungs-Szenario',
        description: 'Erstellt einen Plan für aggressive Skalierung inklusive Finanzierungs-Check.',
        prompt: 'Entwirf ein Skalierungs-Szenario: Verdopple den Absatz im 3. Jahr, berechne den Kapitalbedarf für zusätzliches Personal und schlage eine passende Finanzierung vor. Gib das vollständige geänderte Datenobjekt zurück.',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'prompt_default_4',
        name: 'Agentic: Investor Dashboard',
        description: 'Generiert eine Management-Summary mit Fokus auf ROI und Kapitalfluss.',
        prompt: 'Erstelle eine Management-Summary für potenzielle Investoren. Hebe den ROI, den Break-Even-Point und die Cash-Burn-Rate hervor. Nutze Tabellen zur Visualisierung der wichtigsten Kennzahlen.',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
];

const defaultAiSettings: AiSettings = {
    provider: 'ollama',
    apiKeyGemini: '',
    apiKeyOpenAI: '',
    apiKeyClaude: '',
    model: 'qwen2.5:14b',
    temperature: 0.2,
    topK: 30,
    topP: 0.4,
    numCtx: 125000,
    numPredict: 32000,
    searchEnabled: false,
    searchProvider: 'duckduckgo',
    searchUrl: 'https://duckduckgo.com',
    searchSafeSearch: '0',
    searchRegion: 'all',
    ollamaUrl: 'http://localhost:11434',
    selectedPersonaId: 'persona_standard',
    customPersonas: [],
    smtp: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        from: ''
    }
};

import { v4 as uuidv4 } from 'uuid';

const basisProjects: Project[] = [
    {
    "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    "projectName": "Basis Beispiel",
    "projectStatus": "active",
    "metadata": { "imported": true, "version": "1.0" },
    "data": {
      "settings": {
        "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
        "title": "Basis Beispiel",
        "companyName": "Mein erstes Unternehmen",
        "legalForm": "Gewerbe (Einzelunternehmen)",
        "foundationDate": "2024-01-01",
        "planningYears": 3,
        "isVatDeductible": true,
        "metadata": {},
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      "products": [
        { "id": "p1-uuid-4c3d-9d41-3b7c3d9b047a", "name": "Produkt A", "description": "", "targetPrice": 100, "vatRate": 19, "materialCosts": 20, "productionCosts": 15, "adminCosts": 5, "marketingSalesCosts": 10, "marginPercentage": 10, "otherCosts": 0, "revenueDelayWeeks": 4, "reservePercentage": 0, "reserveDelayWeeks": 0, "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" }
      ],
      "sales": {
        "p1-uuid-4c3d-9d41-3b7c3d9b047a": [ [10,12,14,16,18,20,22,24,26,28,30,32], [35,38,41,44,47,50,53,56,59,62,65,68], [70,73,76,79,82,85,88,91,94,97,100,103] ]
      },
      "privateNeeds": [
        { "id": "pn1-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Miete privat", "isExpanded": false, "directCosts": [ [800,800,800,800,800,800,800,800,800,800,800,800], [800,800,800,800,800,800,800,800,800,800,800,800], [800,800,800,800,800,800,800,800,800,800,800,800] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn2-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Nebenkosten (Strom, Wasser)", "isExpanded": false, "directCosts": [ [250,250,250,250,250,250,250,250,250,250,250,250], [250,250,250,250,250,250,250,250,250,250,250,250], [250,250,250,250,250,250,250,250,250,250,250,250] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn3-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Lebensmittel & Haushalt", "isExpanded": false, "directCosts": [ [600,600,600,600,600,600,600,600,600,600,600,600], [600,600,600,600,600,600,600,600,600,600,600,600], [600,600,600,600,600,600,600,600,600,600,600,600] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn4-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Kleidung", "isExpanded": false, "directCosts": [ [150,150,150,150,150,150,150,150,150,150,150,150], [150,150,150,150,150,150,150,150,150,150,150,150], [150,150,150,150,150,150,150,150,150,150,150,150] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn5-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Freizeit & Kultur", "isExpanded": false, "directCosts": [ [200,200,200,200,200,200,200,200,200,200,200,200], [200,200,200,200,200,200,200,200,200,200,200,200], [200,200,200,200,200,200,200,200,200,200,200,200] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn6-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Urlaub", "isExpanded": false, "directCosts": [ [100,100,100,100,100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100,100,100,100,100] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn7-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Sonstiges", "isExpanded": false, "directCosts": [ [100,100,100,100,100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100,100,100,100,100], [100,100,100,100,100,100,100,100,100,100,100,100] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        { "id": "pn8-uuid-0690-4c3d-9d41-3b7c3d9b047a", "category": "Private Versicherungen", "isExpanded": false, "directCosts": [ [150,150,150,150,150,150,150,150,150,150,150,150], [150,150,150,150,150,150,150,150,150,150,150,150], [150,150,150,150,150,150,150,150,150,150,150,150] ], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" }
      ],
      "financing": [
        { "id": "f1-uuid-0690-4c3d-9d41-3b7c3d9b047a", "source": "Eigeneinlage", "description": "", "type": "equity", "amount": 10000, "interestRate": 0, "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" }
      ],
      "assets": [
        { "id": "a1-uuid-0690-4c3d-9d41-3b7c3d9b047a", "name": "Büroausstattung", "description": "", "purchasePrice": 5000, "usefulLifeYears": 5, "purchaseDate": "2024-01-01", "depreciationCategory": "Büromöbel (Büroschreibtisch, -stuhl etc.)", "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" }
      ],
      "startupCosts": { "id": "sc-uuid-0690-4c3d-9d41-3b7c3d9b047a", "inventoryMaterial": 1000, "rndOthers": 200, "startupConsulting": 500, "marketingTravel": 300, "registrationFees": 60, "initialCapital": 0, "brokerDeposit": 0, "licensesAndOthers": 100, "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
      "operationalCosts": {
        "managementSalary": { "id": "o-ceo-uuid-0690-4c3d-9d41-3b7c3d9_b047a", "isExpanded": false, "directCosts": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "personnelCosts": { "id": "o-per-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "rentAndFacilities": { "id": "o-fac-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[500,500,500,500,500,500,500,500,500,500,500,500],[500,500,500,500,500,500,500,500,500,500,500,500],[500,500,500,500,500,500,500,500,500,500,500,500]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "officeSupplies": { "id": "o-off-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[150,150,150,150,150,150,150,150,150,150,150,150],[150,150,150,150,150,150,150,150,150,150,150,150],[150,150,150,150,150,150,150,150,150,150,150,150]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "vehicleExpenses": { "id": "o-veh-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[300,300,300,300,300,300,300,300,300,300,300,300],[300,300,300,300,300,300,300,300,300,300,300,300],[300,300,300,300,300,300,300,300,300,300,300,300]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "advertisingCosts": { "id": "o-adv-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[200,200,200,200,200,200,200,200,200,200,200,200],[200,200,200,200,200,200,200,200,200,200,200,200],[200,200,200,200,200,200,200,200,200,200,200,200]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "insuranceAndFees": { "id": "o-ins-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[100,100,100,100,100,100,100,100,100,100,100,100],[100,100,100,100,100,100,100,100,100,100,100,100],[100,100,100,100,100,100,100,100,100,100,100,100]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "consultingCosts": { "id": "o-con-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[100,100,100,100,100,100,100,100,100,100,100,100],[100,100,100,100,100,100,100,100,100,100,100,100],[100,100,100,100,100,100,100,100,100,100,100,100]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "travelExpenses": { "id": "o-tra-uuid-0690-4c3d-9d41-3b7c3d9b047a", "isExpanded": false, "directCosts": [[50,50,50,50,50,50,50,50,50,50,50,50],[50,50,50,50,50,50,50,50,50,50,50,50],[50,50,50,50,50,50,50,50,50,50,50,50]], "subItems": [], "metadata": {}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
        "otherOperatingExpenses": { 
          "id": "o-oth-uuid-0690-4c3d-9d41-3b7c3d9b047a",
          "isExpanded": true, 
          "directCosts": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]], 
          "subItems": [
            {
                "id": "item-gr-uuid-0690-4c3d-9d41-3b7c3d9b047a",
                "name": "Gründungskosten",
                "description": "Einmalige Kosten zur Gründung",
                "costs": [[2160,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
                "activeInYears": [0],
                "metadata": {},
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            }
          ],
          "metadata": {},
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        }
      },
      "savedChats": [],
      "productCategories": [],
      "scenarios": [],
    }
    }
];

const createDefaultOpCostCategory = (): OpCostCategory => ({
    id: uuidv4(),
    isExpanded: false,
    directCosts: createYearlyArray(3, 0),
    subItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

export const createDefaultFinancialData = (): FinancialData => {
    const prodId = uuidv4();
    return {
        settings: {
            id: uuidv4(),
            title: 'Neues Projekt',
            companyName: 'Mein Unternehmen',
            legalForm: 'Gewerbe (Einzelunternehmen)',
            foundationDate: new Date().toISOString().split('T')[0],
            planningYears: 3,
            isVatDeductible: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        products: [{ 
            id: prodId, 
            name: 'Standardprodukt', 
            description: '', 
            targetPrice: 0, 
            vatRate: 19, 
            materialCosts: 0, 
            productionCosts: 0, 
            adminCosts: 0, 
            marketingSalesCosts: 0, 
            marginPercentage: 0, 
            otherCosts: 0, 
            revenueDelayWeeks: 0, 
            reservePercentage: 0, 
            reserveDelayWeeks: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }],
        sales: { [prodId]: createYearlyArray(3, 0) },
        privateNeeds: [
            { id: uuidv4(), category: "Miete privat", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Nebenkosten (Strom, Wasser)", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Lebensmittel & Haushalt", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Kleidung", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Freizeit & Kultur", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Urlaub", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Sonstiges", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: uuidv4(), category: "Private Versicherungen", isExpanded: false, directCosts: createYearlyArray(3, 0), subItems: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        financing: [{ id: uuidv4(), source: 'Eigeneinlage', type: 'equity', amount: 0, interestRate: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        assets: [{ id: uuidv4(), name: 'Laptop', purchasePrice: 0, usefulLifeYears: 3, purchaseDate: new Date().toISOString().split('T')[0], depreciationCategory: "Notebooks (Laptop)", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        operationalCosts: {
            managementSalary: createDefaultOpCostCategory(),
            personnelCosts: createDefaultOpCostCategory(),
            rentAndFacilities: createDefaultOpCostCategory(),
            officeSupplies: createDefaultOpCostCategory(),
            vehicleExpenses: createDefaultOpCostCategory(),
            advertisingCosts: createDefaultOpCostCategory(),
            insuranceAndFees: createDefaultOpCostCategory(),
            consultingCosts: createDefaultOpCostCategory(),
            travelExpenses: createDefaultOpCostCategory(),
            otherOperatingExpenses: {
                ...createDefaultOpCostCategory(),
                isExpanded: true,
                subItems: [
                    {
                        id: 'foundation-costs-' + uuidv4().slice(0, 8),
                        name: 'Gründungskosten',
                        description: 'Einmalige Kosten zur Gründung des Unternehmens',
                        costs: createYearlyArray(3, 0),
                        activeInYears: [0],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ]
            },
        },
        startupCosts: { 
            id: uuidv4(),
            inventoryMaterial: 0, 
            rndOthers: 0, 
            startupConsulting: 0, 
            marketingTravel: 0, 
            registrationFees: 0, 
            initialCapital: 0, 
            brokerDeposit: 0, 
            licensesAndOthers: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        savedChats: [],
        productCategories: [],
        scenarios: [],
    };
};

const defaultProject: Project = {
    id: uuidv4(),
    projectName: 'Standardprojekt',
    projectStatus: 'active',
    data: createDefaultFinancialData(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const createInitialAppState = (): AppState => ({
    projects: [defaultProject],
    activeProjectId: defaultProject.id,
    aiSettings: defaultAiSettings,
    customAiPrompts: defaultAiPrompts,
});

export const getInitialProjectsForLevel = (count: number = 1): Project[] => {
    return [...basisProjects].slice(0, count);
};

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const resizeYearlyData = (data: FinancialData, newYears: number): FinancialData => {
    const resized = deepClone(data);
    resized.settings.planningYears = newYears;

    const resizeMatrix = (arr: number[][], expectedYears: number): number[][] => {
        const currentArr = Array.isArray(arr) ? arr : [];
        if (currentArr.length === expectedYears) {
            // Already correct length, but ensure each year is a 12-element array
            return currentArr.map(year => Array.isArray(year) ? (year.length === 12 ? year : [...year, ...Array(12 - year.length).fill(0)].slice(0, 12)) : Array(12).fill(0));
        }
        
        if (currentArr.length > expectedYears) {
            return currentArr.slice(0, expectedYears);
        }

        // Need to expand
        const lastYearData = currentArr.length > 0 ? (currentArr[currentArr.length - 1] || Array(12).fill(0)) : Array(12).fill(0);
        const expanded = [...currentArr];
        while (expanded.length < expectedYears) {
            expanded.push([...lastYearData]);
        }
        return expanded;
    };

    // Resize sales data
    if (resized.sales) {
        for (const productId in resized.sales) {
            resized.sales[productId] = resizeMatrix(resized.sales[productId], newYears);
        }
    }

    // Resize privateNeeds
    if (Array.isArray(resized.privateNeeds)) {
        resized.privateNeeds.forEach(need => {
            need.directCosts = resizeMatrix(need.directCosts, newYears);
            if (Array.isArray(need.subItems)) {
                need.subItems.forEach(sub => { sub.costs = resizeMatrix(sub.costs, newYears); });
            }
        });
    }

    // Resize operationalCosts
    if (resized.operationalCosts) {
        (Object.keys(resized.operationalCosts) as OpCostCategoryKey[]).forEach(key => {
            const cat = resized.operationalCosts[key];
            if (cat) {
                cat.directCosts = resizeMatrix(cat.directCosts, newYears);
                if (Array.isArray(cat.subItems)) {
                    cat.subItems.forEach(sub => { sub.costs = resizeMatrix(sub.costs, newYears); });
                }
            }
        });
    }

    return resized;
};

export const validateAndSanitizeFinancialData = (data: unknown): { isValid: boolean, data?: FinancialData, error?: string } => {
    try {
        if (typeof data !== 'object' || data === null) {
            return { isValid: false, error: "Top-level data is not an object." };
        }
        
        const dataObj = data as Record<string, unknown>;

        // Basic Type Checks and Sanitization
        const defaultData = createDefaultFinancialData();
        const s = (val: unknown, def: string) => typeof val === 'string' ? val : def;
        const n = (val: unknown, def: number) => typeof val === 'number' && !isNaN(val) ? val : def;
        const b = (val: unknown, def: boolean) => typeof val === 'boolean' ? val : def;

        const normalizeCat = (cat: unknown) => {
            if (!cat || typeof cat !== 'object') return createDefaultOpCostCategory();
            const catObj = cat as Record<string, unknown>;
            return {
                ...createDefaultOpCostCategory(),
                ...catObj,
                id: (catObj.id as string) || uuidv4(),
                createdAt: (catObj.createdAt as string) || (catObj.created_at as string) || new Date().toISOString(),
                updatedAt: (catObj.updatedAt as string) || (catObj.updated_at as string) || new Date().toISOString(),
                subItems: (Array.isArray(catObj.subItems || catObj.sub_items) ? (catObj.subItems || catObj.sub_items) as Record<string, unknown>[] : []).map((si) => ({
                    ...si,
                    id: (si.id as string) || uuidv4(),
                    name: (si.name as string) || 'Eintrag',
                    costs: Array.isArray(si.costs) ? si.costs as number[][] : createYearlyArray(n(settingsObj.planningYears, 3), 0),
                    createdAt: (si.createdAt as string) || (si.created_at as string) || new Date().toISOString(),
                    updatedAt: (si.updatedAt as string) || (si.updated_at as string) || new Date().toISOString()
                }))
            };
        };

        const settingsObj = (dataObj.settings as Record<string, unknown>) || {};
        const sanitized: FinancialData = {
            ...defaultData,
            ...dataObj,
            settings: { 
                ...defaultData.settings, 
                ...settingsObj,
                id: (settingsObj.id as string) || uuidv4(),
                planningYears: n(settingsObj.planningYears ?? settingsObj.planning_years, defaultData.settings.planningYears),
                foundationDate: s(settingsObj.foundationDate ?? settingsObj.foundation_date, defaultData.settings.foundationDate),
                isVatDeductible: b(settingsObj.isVatDeductible ?? settingsObj.is_vat_deductible, !!defaultData.settings.isVatDeductible),
                createdAt: (settingsObj.createdAt as string) || (settingsObj.created_at as string) || new Date().toISOString(),
                updatedAt: (settingsObj.updatedAt as string) || (settingsObj.updated_at as string) || new Date().toISOString(),
            },
            products: Array.isArray(dataObj.products) ? (dataObj.products as Record<string, unknown>[]).map((p) => ({
                ...p,
                id: (p.id as string) || uuidv4(),
                name: s(p.name, 'Standardprodukt'),
                description: s(p.description, ''),
                targetPrice: n(p.targetPrice ?? p.target_price ?? p.price, 0),
                vatRate: n(p.vatRate ?? p.vat_rate ?? p.umsatzsteuer_satz ?? p.umsatzsteuer, 19),
                materialCosts: n(p.materialCosts ?? p.material_costs ?? p.materialkosten, 0),
                productionCosts: n(p.productionCosts ?? p.production_costs ?? p.fertigungskosten, 0),
                adminCosts: n(p.adminCosts ?? p.admin_costs ?? p.verwaltungskosten, 0),
                marketingSalesCosts: n(p.marketingSalesCosts ?? p.marketing_sales_costs ?? p.marketing_vertriebskosten ?? p.marketingVertriebskosten, 0),
                marginPercentage: n(p.marginPercentage ?? p.margin_percentage ?? p.marge_prozent ?? p.margin ?? p.marge, 0),
                otherCosts: n(p.otherCosts ?? p.other_costs ?? p.sonstige_kosten ?? p.sonstigeKosten, 0),
                revenueDelayWeeks: n(p.revenueDelayWeeks ?? p.revenue_delay_weeks ?? p.einnahmenverzoegerung_wochen, 0),
                reservePercentage: n(p.reservePercentage ?? p.reserve_percentage ?? p.vorbehalt_prozent, 0),
                reserveDelayWeeks: n(p.reserveDelayWeeks ?? p.reserve_delay_weeks ?? p.vorbehalt_verzoegerung_wochen, 0),
                createdAt: (p.createdAt as string) || (p.created_at as string) || new Date().toISOString(),
                updatedAt: (p.updatedAt as string) || (p.updated_at as string) || new Date().toISOString(),
            })) : defaultData.products,
            sales: (typeof dataObj.sales === 'object' && dataObj.sales ? dataObj.sales : defaultData.sales) as Record<string, number[][]>,
            privateNeeds: Array.isArray(dataObj.privateNeeds) ? (dataObj.privateNeeds as Record<string, unknown>[]).map((pn) => ({
                ...pn,
                id: (pn.id as string) || uuidv4(),
                category: s(pn.category, 'Sonstiges'),
                isExpanded: b(pn.isExpanded ?? pn.is_expanded, false),
                directCosts: Array.isArray(pn.directCosts) ? pn.directCosts as number[][] : createYearlyArray(n(settingsObj.planningYears, 3), 0),
                createdAt: (pn.createdAt as string) || (pn.created_at as string) || new Date().toISOString(),
                updatedAt: (pn.updatedAt as string) || (pn.updated_at as string) || new Date().toISOString(),
                subItems: (Array.isArray(pn.subItems || pn.sub_items) ? (pn.subItems || pn.sub_items) as Record<string, unknown>[] : []).map((si) => ({
                    ...si,
                    id: (si.id as string) || uuidv4(),
                    name: s(si.name, 'Eintrag'),
                    costs: Array.isArray(si.costs) ? si.costs as number[][] : createYearlyArray(n(settingsObj.planningYears, 3), 0),
                    createdAt: (si.createdAt as string) || (si.created_at as string) || new Date().toISOString(),
                    updatedAt: (si.updatedAt as string) || (si.updated_at as string) || new Date().toISOString()
                }))
            })) : defaultData.privateNeeds,
            financing: Array.isArray(dataObj.financing) ? (dataObj.financing as Record<string, unknown>[]).map((f) => ({
                ...f,
                id: (f.id as string) || uuidv4(),
                source: s(f.source, 'Eigeneinlage'),
                type: (f.type as any) || 'equity',
                amount: n(f.amount, 0),
                interestRate: n(f.interestRate ?? f.interest_rate, 0),
                startDate: s(f.startDate ?? f.start_date, ""),
                endDate: s(f.endDate ?? f.end_date, ""),
                createdAt: (f.createdAt as string) || (f.created_at as string) || new Date().toISOString(),
                updatedAt: (f.updatedAt as string) || (f.updated_at as string) || new Date().toISOString(),
            })) : defaultData.financing,
            assets: Array.isArray(dataObj.assets) ? (dataObj.assets as Record<string, unknown>[]).map((a) => ({
                ...a,
                id: (a.id as string) || uuidv4(),
                name: s(a.name, 'Anlagegut'),
                purchasePrice: n(a.purchasePrice ?? a.purchase_price ?? a.purchaseCost ?? a.purchase_cost, 0),
                usefulLifeYears: n(a.usefulLifeYears ?? a.useful_life_years, 3),
                purchaseDate: s(a.purchaseDate ?? a.purchase_date, (defaultData.assets && defaultData.assets.length > 0) ? defaultData.assets[0].purchaseDate : new Date().toISOString().split('T')[0]),
                depreciationCategory: s(a.depreciationCategory ?? a.afa_category ?? a.afaItem, 'Sonstiges'),
                createdAt: (a.createdAt as string) || (a.created_at as string) || new Date().toISOString(),
                updatedAt: (a.updatedAt as string) || (a.updated_at as string) || new Date().toISOString(),
            })) : defaultData.assets,
            startupCosts: (() => {
                const sc = (dataObj.startupCosts as Record<string, unknown>) || {};
                return {
                    id: (sc.id as string) || uuidv4(),
                    inventoryMaterial: n(sc.inventoryMaterial ?? sc.inventory_material ?? sc.warenlager_material ?? sc.waren_material, 0),
                    rndOthers: n(sc.rndOthers ?? sc.rnd_others ?? sc.sonstiges_forschung_entwicklung ?? sc.sonstiges_forschung, 0),
                    startupConsulting: n(sc.startupConsulting ?? sc.startup_consulting ?? sc.beratung_gruendung ?? sc.consulting ?? sc.beratung, 0),
                    marketingTravel: n(sc.marketingTravel ?? sc.marketing_travel ?? sc.marketing_reisen ?? sc.info_reisen_werbung, 0),
                    registrationFees: n(sc.registrationFees ?? sc.registration_fees ?? sc.gewerbeanmeldung_gebuehren ?? sc.businessRegistration ?? sc.business_registration ?? sc.gewerbeanmeldung, 0),
                    initialCapital: n(sc.initialCapital ?? sc.initial_capital ?? sc.stammeinlage_kapital ?? sc.stammeinlage, 0),
                    brokerDeposit: n(sc.brokerDeposit ?? sc.broker_deposit ?? sc.makler_kaution, 0),
                    licensesAndOthers: n(sc.licensesAndOthers ?? sc.licenses_others ?? sc.lizenzen_sonstiges ?? sc.sonstiges_lizenzen, 0),
                    createdAt: (sc.createdAt as string) || (sc.created_at as string) || new Date().toISOString(),
                    updatedAt: (sc.updatedAt as string) || (sc.updated_at as string) || new Date().toISOString(),
                };
            })(),
            operationalCosts: dataObj.operationalCosts ? (() => {
                const oc = dataObj.operationalCosts as Record<string, unknown>;
                return {
                    managementSalary: normalizeCat(oc.managementSalary ?? (oc.management_salary ?? (oc.geschaeftsfuehrung_gehalt || (oc.ceoSalaries || (oc.ceo_authorities || oc.geschaeftsfuehrergehaelter))))),
                    personnelCosts: normalizeCat(oc.personnelCosts ?? (oc.personnel_costs ?? (oc.personalkosten || (oc.personnel || oc.personal)))),
                    rentAndFacilities: normalizeCat(oc.rentAndFacilities ?? (oc.rent_facilities ?? (oc.raumkosten || (oc.facilityCosts || oc.facility_costs)))),
                    officeSupplies: normalizeCat(oc.officeSupplies ?? (oc.office_supplies ?? (oc.buerokosten || (oc.officeCosts || (oc.office_costs || oc.laufende_buerokosten))))),
                    vehicleExpenses: normalizeCat(oc.vehicleExpenses ?? (oc.vehicle_expenses ?? (oc.fahrzeugkosten || (oc.vehicleCosts || oc.vehicle_costs)))),
                    advertisingCosts: normalizeCat(oc.advertisingCosts ?? (oc.advertising_costs ?? oc.werbekosten)),
                    insuranceAndFees: normalizeCat(oc.insuranceAndFees ?? (oc.insurance_fees ?? (oc.versicherungen_beitraege || (oc.insurance || oc.versicherungen)))),
                    consultingCosts: normalizeCat(oc.consultingCosts ?? (oc.consulting_costs ?? oc.beratungskosten)),
                    travelExpenses: normalizeCat(oc.travelExpenses ?? (oc.travel_expenses ?? (oc.reisekosten || (oc.travelCosts || oc.travel_costs)))),
                    otherOperatingExpenses: normalizeCat(oc.otherOperatingExpenses ?? (oc.other_operating_expenses ?? (oc.sonstige_betriebsausgaben || (oc.otherExpenses || (oc.other_expenses || oc.sonstige_aufwendungen))))),
                };
            })() : defaultData.operationalCosts,
            savedChats: Array.isArray(dataObj.savedChats) ? (dataObj.savedChats as Record<string, unknown>[]).map((sc) => ({
                ...sc,
                id: (sc.id as string) || uuidv4(),
                name: s(sc.name, 'Gespeicherter Chat'),
                timestamp: s(sc.timestamp, new Date().toISOString()),
                history: Array.isArray(sc.history) ? sc.history as ChatMessage[] : [],
                createdAt: (sc.createdAt as string) || (sc.created_at as string) || new Date().toISOString(),
                updatedAt: (sc.updatedAt as string) || (sc.updated_at as string) || new Date().toISOString()
            })) : defaultData.savedChats,
            productCategories: Array.isArray(dataObj.productCategories) ? (dataObj.productCategories as Record<string, unknown>[]).map((cat) => ({
                ...cat,
                id: (cat.id as string) || uuidv4(),
                name: s(cat.name, 'Kategorie'),
                cogsPercentage: n(cat.cogsPercentage ?? cat.wareneinsatz_prozent ?? cat.cogsPercentage ?? cat.cogs_percentage, 0),
                revenueDelayWeeks: n(cat.revenueDelayWeeks ?? cat.einnahmenverzoegerung_wochen ?? cat.revenueDelayWeeks ?? cat.revenue_delay_weeks, 0),
                reservePercentage: n(cat.reservePercentage ?? cat.vorbehalt_prozent ?? cat.reservePercentage ?? cat.reserve_percentage, 0),
                reserveDelayWeeks: n(cat.reserveDelayWeeks ?? cat.vorbehalt_verzoegerung_wochen ?? cat.reserveDelayWeeks ?? cat.reserve_delay_weeks, 0),
                createdAt: (cat.createdAt as string) || (cat.created_at as string) || new Date().toISOString(),
                updatedAt: (cat.updatedAt as string) || (cat.updated_at as string) || new Date().toISOString(),
            })) : defaultData.productCategories,
            scenarios: Array.isArray(dataObj.scenarios) ? (dataObj.scenarios as Record<string, unknown>[]).map((sc) => ({
                ...sc,
                id: (sc.id as string) || uuidv4(),
                name: s(sc.name, 'Szenario'),
                description: s(sc.description, ''),
                createdAt: (sc.createdAt as string) || (sc.created_at as string) || new Date().toISOString(),
                updatedAt: (sc.updatedAt as string) || (sc.updated_at as string) || new Date().toISOString(),
                adjustments: (Array.isArray(sc.adjustments) ? sc.adjustments as Record<string, unknown>[] : []).map((adj) => ({
                    ...adj,
                    id: (adj.id as string) || uuidv4(),
                    target: (adj.target as any) || 'salesForecast',
                    targetId: (adj.targetId as string) || 'all',
                    changeValue: (adj.changeValue as number) || 0,
                    startYear: (adj.startYear as number) || 0,
                    endYear: (adj.endYear as number) || 0,
                    createdAt: (adj.createdAt as string) || (adj.created_at as string) || new Date().toISOString(),
                    updatedAt: (adj.updatedAt as string) || (adj.updated_at as string) || new Date().toISOString()
                }))
            })) : defaultData.scenarios,
        };
        
        // Ensure planning years match array lengths
        const planningYears = sanitized.settings.planningYears;
        const finalData = resizeYearlyData(sanitized, planningYears);

        return { isValid: true, data: finalData };
    } catch (e: unknown) {
        return { isValid: false, error: e instanceof Error ? e.message : String(e) };
    }
};
