/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

export interface BaseEntity {
    id: string; // Strictly UUID v4 recommended
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>; // For extension & AI metadata
}

// --- DATA TYPES ---
export interface CompanySettings extends BaseEntity {
    title: string;
    companyName: string;
    legalForm: string;
    foundationDate: string; // YYYY-MM-DD
    planningYears: number;
    taxRate?: number; // Optionaler Steuersatz in Prozent
    isVatDeductible?: boolean;
}

export interface PrivateNeedSubItem extends BaseEntity {
    name: string;
    description?: string;
    costs: number[][];
    activeInYears?: number[];
}

export interface PrivateNeed extends BaseEntity {
    category: string;
    isExpanded: boolean;
    directCosts: number[][];
    subItems: PrivateNeedSubItem[];
}

export interface FinancingItem extends BaseEntity {
    source: string;
    description?: string;
    type: 'equity' | 'debt';
    amount: number;
    interestRate: number; // Percentage
    startDate?: string; // YYYY-MM-DD, for debt only
    endDate?: string; // YYYY-MM-DD, for debt only
    graceMonths?: number; // for debt only
}

export interface ProductCategory extends BaseEntity {
    name: string;
    description?: string;
    cogsPercentage?: number; 
    revenueDelayWeeks?: number; 
    reservePercentage?: number; 
    reserveDelayWeeks?: number; 
}

export interface Product extends BaseEntity {
    name: string;
    description: string;
    targetPrice: number; 
    vatRate: number; 
    materialCosts: number; 
    productionCosts: number; 
    adminCosts: number; 
    marketingSalesCosts: number; 
    marginPercentage: number; 
    otherCosts: number; 
    revenueDelayWeeks: number;
    reservePercentage: number;
    reserveDelayWeeks: number;
    categoryId?: string;
}

export interface Asset extends BaseEntity {
    name: string;
    description?: string;
    purchasePrice: number;
    usefulLifeYears: number;
    purchaseDate: string; // YYYY-MM-DD
    depreciationCategory: string;
}

export type SalesData = Record<string, number[][]>;

export interface OpCostSubItem extends BaseEntity {
    name: string;
    description?: string;
    costs: number[][];
    activeInYears?: number[];
}

export interface OpCostCategory extends BaseEntity {
    isExpanded: boolean;
    directCosts: number[][];
    subItems: OpCostSubItem[];
}

export type OpCostCategoryKey = 
    'managementSalary' | 
    'personnelCosts' | 
    'rentAndFacilities' | 
    'officeSupplies' | 
    'vehicleExpenses' | 
    'advertisingCosts' | 
    'insuranceAndFees' | 
    'consultingCosts' | 
    'travelExpenses' | 
    'otherOperatingExpenses';

export type OperationalCostsData = Record<OpCostCategoryKey, OpCostCategory>;

export interface StartupCosts extends BaseEntity {
    inventoryMaterial: number; 
    rndOthers: number; 
    startupConsulting: number; 
    marketingTravel: number; 
    registrationFees: number; 
    initialCapital: number; 
    brokerDeposit: number; 
    licensesAndOthers: number; 
}


export interface AiExecutionContext {
    systemInstruction: string;
    userPrompt: string;
    history: ChatMessage[];
    activeSlices: string[];
    plan: { tool: string; input: string; reason: string }[];
    thinkingModeActive: boolean;
    originalProjectData: FinancialData;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'error';
    content: string;
    rawContent?: string; // Semantic nomenclature
    thought?: string;
    createdAt: string; // Semantic: instead of timestamp
    updatedAt?: string;
    metadata?: Record<string, unknown>;
    changeProposal?: FinancialData;
    changeDiff?: string[];
    sources?: { uri: string; title: string; }[];
    feedback?: 'positive' | 'negative';
    feedbackReason?: string; // Semantic nomenclature
    contextAtTime?: AiExecutionContext; 
    followUpPrompt?: string;
    continueAction?: boolean;
    actionConfirmation?: {
        action: 'CREATE_NEW_PROJECT' | 'KB_INGEST';
    };
    kbChoiceAction?: {
        fileName: string;
        pendingId: string;
    };
    usage?: TokenUsage;
    timestamp?: string; // Legacy support
}

export interface SavedChat extends BaseEntity {
    name: string;
    timestamp: string;
    history: ChatMessage[];
}

export interface CustomAiPrompt extends BaseEntity {
    name: string;
    description: string;
    prompt: string;
}

export type ScenarioTarget = 'salesForecast' | 'operationalCosts'; // Semantic nomenclature

export interface ScenarioAdjustment extends BaseEntity {
    target: ScenarioTarget;
    targetId: 'all' | string | OpCostCategoryKey;
    changeValue: number; // as percentage
    startYear: number; // 0-indexed
    endYear: number; // 0-indexed
}

export interface Scenario extends BaseEntity {
    name: string;
    description: string;
    adjustments: ScenarioAdjustment[];
}

export interface FinancialData {
    settings: CompanySettings;
    products: Product[];
    sales: SalesData;
    privateNeeds: PrivateNeed[];
    financing: FinancingItem[];
    assets: Asset[];
    operationalCosts: OperationalCostsData;
    startupCosts: StartupCosts;
    savedChats?: SavedChat[];
    productCategories?: ProductCategory[];
    scenarios?: Scenario[];
}

export interface Project extends BaseEntity {
    projectName: string; // Semantic: project_name
    projectStatus: string; // Semantic: project_status (active, archived, etc.)
    rawContent?: string; // Original external data if applicable
    data: FinancialData;
}

export interface AppState {
    projects: Project[];
    activeProjectId: string | null;
    aiSettings?: AiSettings;
    customAiPrompts?: CustomAiPrompt[];
}

export interface SaveHistoryEntry {
    timestamp: string;
    appStateSnapshot: AppState;
}

export interface AiPersona extends BaseEntity {
    name: string;
    prompt: string;
    description?: string;
    tone?: string;
}

export type AiProvider = 'ollama' | 'gemini' | 'openai' | 'claude';

export type SearchProvider = 'duckduckgo' | 'google' | 'brave' | 'searxng';

export interface EmailSignature extends BaseEntity {
    name: string;
    content: string;
}

export interface EmailTemplate extends BaseEntity {
    name: string;
    subject: string;
    body: string;
}

export interface AiSettings {
    provider: AiProvider;
    model: string;
    apiKeyGemini?: string;
    apiKeyOpenAI?: string;
    apiKeyClaude?: string;
    temperature: number;
    topK: number;
    topP: number;
    numCtx: number;
    numPredict: number;
    searchEnabled: boolean;
    searchProvider: SearchProvider;
    searchUrl: string;
    searchSafeSearch: string;
    searchRegion: string;
    ollamaUrl: string;
    openAiBaseUrl?: string; // vLLM / OpenAI-compatible local API
    selectedPersonaId: string;
    customPersonas: AiPersona[];
    smtp?: SmtpSettings;
    signatures?: EmailSignature[];
    templates?: EmailTemplate[];
}

export interface SmtpSettings {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
}

export interface MonthlyData {
    revenueNoReserve: number;
    revenueWithReserve: number;
    totalRevenue: number;
    variableCosts: number;
    operationalCosts: number;
    depreciation: number;
    interest: number;
    profitBeforeTax: number;
    taxAmount: number;
    profitAfterTax: number;
    privateWithdrawals: number;
    remainingCashflow: number;
}

export interface YearData {
    revenue: number;
    variableCosts: number;
    operationalCosts: number;
    depreciation: number;
    interest: number;
    taxAmount: number;
    privateWithdrawals: number;
    endBalance: number;
    grossProfit: number;
    profitBeforeTax: number;
    profitAfterTax: number;
    netCashFlow: number;
    returnOnSales: number;
    breakEvenRevenue: number;
    cashBreakEvenRevenue: number;
    roi: number;
}

export interface CashFlowData {
    revenueNet: number[][];
    vatCollected: number[][];
    vatPaid: number[][];
    variableCosts: number[][];
    opCosts: Record<OpCostCategoryKey, number[][]>;
    interestPayments: number[][];
    vatPayments: number[][];
    repayments: number[][];
    privateWithdrawals: number[][];
    equityInflow: number[][];
    debtInflow: number[][];
    investmentOutflows: number[][];
    accumulatedLiquidity: number[][];
}

export interface TotalOverview {
    totalRevenue: number;
    totalProfit: number;
    totalEquity: number;
    averageROS: number;
    finalROI: number;
    paybackMonths: number;
}

export interface CalculationResults {
    yearly: YearData[];
    monthly: MonthlyData[][];
    cashFlow: CashFlowData;
    totalOverview: TotalOverview;
}

export type ViewType = 'overview' | 'basicSettings' | 'privateDemand' | 'financingPlan' | 'depreciationPlan' | 'productPricing' | 'salesPlan' | 'earningsPlan' | 'liquidityPlan' | 'settings';

export type ModalInfo =
    | { type: 'deleteProject' }
    | { type: 'confirmResetProject' }
    | { type: 'cannotDeleteLastProject' }
    | { type: 'importConflict', newProject: Project, existingProject: Project }
    | { type: 'finalOverwriteConfirm', newProject: Project, existingProject: Project }
    | { type: 'confirmNewProjectImport', newProject: Project }
    | { type: 'print' }
    | { type: 'legalInfo' }
    | { type: 'sendEmail' }
    | { type: 'confirmSwitchProject', projectId: string }
    | { type: 'confirmNewProjectUnsaved' }
    | { type: 'confirmRestore', entry: SaveHistoryEntry }
    | { type: 'error', title: string, message: string };