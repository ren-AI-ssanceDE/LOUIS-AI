
import { FinancialData, CalculationResults, AiPersona } from '../../../types.ts';

export type ToolResult = {
  success: boolean;
  data?: FinancialData | unknown; // FinancialData for financial_architect, or other for search/knowledge
  message?: string;
  contextAddition?: string;
  sources?: { uri: string, title: string }[];
};

export interface FinancialToolContext {
  proposedData?: Partial<FinancialData>;
  currentProjectData: FinancialData;
  isNewProject?: boolean;
  calculations?: CalculationResults;
  prompt?: string; // Additional context for tools
  projectId?: string;
  searchProvider?: string;
  searchUrl?: string;
  searchSafeSearch?: string;
  searchRegion?: string;
  projectToken?: string;
  persona?: AiPersona;
}

export interface AiTool {
  id: string;
  name: string;
  description: string;
  execute(input: string, context?: FinancialToolContext): Promise<ToolResult>;
}
