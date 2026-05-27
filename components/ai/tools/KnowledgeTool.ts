import { AiTool, ToolResult, FinancialToolContext } from './types.ts';
import { vectorService, KnowledgeResult } from '../../../services/vectorService.ts';

export class KnowledgeTool implements AiTool {
  id = 'local_knowledge';
  name = 'Knowledge Base';
  description = 'Sucht in lokalen Dokumenten und Wissensdatenbanken nach relevanten Informationen.';

  async execute(query: string, context: FinancialToolContext): Promise<ToolResult> {
    try {
      const searchIntent = (context.prompt || '').toLowerCase();
      const isDataRequest = searchIntent.includes('projekt') || searchIntent.includes('erstell') || searchIntent.includes('produk') || searchIntent.includes('kost');
      const searchQuery = isDataRequest 
        ? `${query} Finanzplan Produkte Kosten Preise Businessplan Investitionen Darlehen Steuern` 
        : query;
        
      const results = await vectorService.searchContext(context.projectId || 'default', searchQuery, 20);
      
      if (!results || results.length === 0) {
        return { success: true, contextAddition: "\n\n[System: Keine spezifischen lokalen Dokumente gefunden.]" };
      }

      // Filter by file mention
      const fileMentionMatch = (context.prompt || '').match(/(?:aus|in|mit|von)\s+(?:der\s+|dem\s+)?(?:datei\s+|dokument\s+)?(["']?)([^"'\s]+?\.(?:pdf|docx|xlsx|csv))\1/i);
      const mentionedFile = fileMentionMatch ? fileMentionMatch[2] : null;

      let filteredResults = results;
      if (mentionedFile) {
        const exactMatch = results.filter((r: KnowledgeResult) => r.title.toLowerCase().includes(mentionedFile.toLowerCase()));
        if (exactMatch.length > 0) filteredResults = exactMatch;
      }

      const contextAddition = "\n\n### RELEVANTES LOKALES WISSEN (Hintergrund-Info):\n" + 
        filteredResults.slice(0, 15).map((r: KnowledgeResult) => `- Aus "${r.title}": ${r.text}`).join("\n");
        
      return { success: true, data: filteredResults, contextAddition };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler bei der Wissens-Suche";
      console.warn("KnowledgeTool failed", errorMessage);
      return { success: false, message: "Lokale Suche fehlgeschlagen: " + errorMessage };
    }
  }
}
