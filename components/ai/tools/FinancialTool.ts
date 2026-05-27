import { AiTool, ToolResult, FinancialToolContext } from './types.ts';
import { FinancialData } from '../../../types.ts';
import { validateAndSanitizeFinancialData, createDefaultFinancialData } from '../../../data.ts';
import { deepMerge, deepClone, roundNumbers } from '../../../utils.ts';

interface AiSalesItem {
  productId: string;
  yearlySales: number[][];
}

export class FinancialTool implements AiTool {
  id = 'financial_architect';
  name = 'Financial Architect';
  description = 'Validiert, transformiert und rundet Finanzdaten für den Import und prüft Konsistenz.';

  private transformSalesFromAiFormat(aiSales: AiSalesItem[]): Record<string, number[][]> {
    if (!aiSales || !Array.isArray(aiSales)) return {};
    return aiSales.reduce((acc, current) => {
      if (current.productId && current.yearlySales) {
        return { ...acc, [current.productId]: current.yearlySales };
      }
      return acc;
    }, {} as Record<string, number[][]>);
  }

  async execute(_input: string, context: FinancialToolContext): Promise<ToolResult> {
    // If we have proposed data, we are in "transformation/apply" mode
    if (context.proposedData) {
      try {
        const transformedProposed = { ...context.proposedData };
        if (context.proposedData.sales) {
          transformedProposed.sales = this.transformSalesFromAiFormat(context.proposedData.sales as unknown as AiSalesItem[]);
        }

        let finalData: FinancialData;
        if (context.isNewProject) {
          const baseData = createDefaultFinancialData();
          finalData = deepMerge(baseData, transformedProposed);
        } else {
          const fullContextClone = deepClone(context.currentProjectData);
          finalData = deepMerge(fullContextClone, transformedProposed);
        }
        
        finalData = roundNumbers(finalData);
        const validation = validateAndSanitizeFinancialData(finalData);
        
        if (!validation.isValid) {
          return { success: false, message: "Validisierung fehlgeschlagen: " + (validation.error || "Unbekannter Fehler") };
        }
        
        return { success: true, data: validation.data || finalData };
      } catch (err: unknown) {
        console.error("FinancialTool Transform Error:", err instanceof Error ? err.message : err);
        return { success: false, message: "Finanz-Transformation fehlgeschlagen" };
      }
    }

    // Otherwise we are in "validation/analysis" mode
    if (context.currentProjectData && context.calculations) {
      const issues: string[] = [];
      const data = context.currentProjectData;
      const calcs = context.calculations;

      if (calcs.cashFlow.accumulatedLiquidity?.some((year: number[]) => year.some(m => m < 0))) {
          issues.push("Warnung: Der Liquiditätsplan weist negative Bestände auf.");
      }
      if (data.settings.isVatDeductible === false) {
          issues.push("Hinweis: Das Unternehmen ist nicht vorsteuerabzugsberechtigt.");
      }
      const totalSales = calcs.totalOverview.totalRevenue || 0;
      const totalCosts = totalSales - (calcs.totalOverview.totalProfit || 0);
      if (totalSales > 0 && totalCosts > totalSales * 2) {
          issues.push("Hinweis: Die Betriebskosten übersteigen den Umsatz massiv (> 200%).");
      }

      const message = issues.length === 0 
        ? "Die aktuelle Finanzstruktur ist mathematisch konsistent und plausibel." 
        : "Folgende Auffälligkeiten wurden identifiziert:\n" + issues.join("\n");

      return { 
        success: issues.length === 0, 
        message,
        contextAddition: `\n\n### FINANCIAL ARCHITECT ANALYSE:\n${message}`
      };
    }

    return { success: false, message: "Keine Daten zur Validierung vorhanden" };
  }
}
