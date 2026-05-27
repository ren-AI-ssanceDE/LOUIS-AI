import { extractJsonFromString } from '../../../utils.ts';
import { callAi, AiMessage } from '../../../services/aiService.ts';
import { AiSettings, ChatMessage, TokenUsage } from '../../../types.ts';

export type PlanStep = {
  tool: string;
  input: string;
  reason: string;
};

export type StrategicPlan = {
  intent: 'DATA_CHANGE' | 'ANALYSIS' | 'GENERAL';
  reasoning: string;
  plan: PlanStep[];
  isComplete?: boolean;
};

export class Orchestrator {
  private settings: AiSettings;

  constructor(settings: AiSettings) {
    this.settings = settings;
  }

  async plan(
    prompt: string, 
    history: ChatMessage[], 
    forcedTools: Set<string>, 
    currentResults: string = "", 
    signal?: AbortSignal
  ): Promise<{ plan: StrategicPlan, usage?: TokenUsage }> {
    const manualToolsList = Array.from(forcedTools);
    
    const strategicPrompt = `Du bist der Louis AI Strategieseer (Visionary Agent v2026). Deine Aufgabe ist es, einen präzisen und hocheffizienten Exekutionsplan für die Benutzeranfrage zu erstellen.

### mission:
Analysiere die Benutzeranfrage und entscheide, welche Werkzeuge in welcher Reihenfolge genutzt werden müssen. Du arbeitest ITERATIV. Wenn dir bereits Ergebnisse vorliegen, entscheide, ob diese ausreichen oder ein weiterer Schritt nötig ist.
WICHTIG: Der "intent" beschreibt das ZIEL der Anfrage. Wenn der Nutzer Daten ändern will (z.B. ein Produkt erstellen), bleibt der Intent "DATA_CHANGE", auch wenn du erst recherchieren musst.

### VERFÜGBARE WERKZEUGE:
1. thinking: Deep-Thinking Modus für komplexe strategische Analysen. Nutze dies für SWOT, Strategie-Entwicklung oder komplexe Logik-Checks.
2. web_search: Suche nach aktuellen Marktdaten, Trends oder Fakten. Nutze dies NUR für externe Informationen.
3. local_knowledge: Suche in hochgeladenen Dokumenten des Nutzers.
4. financial_architect: Zwingend erforderlich für JEDE Änderung am Finanzmodell.

### FEW-SHOT BEISPIELE (Intent-Klassifizierung):
- Frage: "Wie geht es meinem Projekt?" -> Intent: ANALYSIS, Plan: [thinking]
- Frage: "Strompreise steigen um 20%, passe meine Kosten an." -> Intent: DATA_CHANGE, Plan: [web_search, financial_architect]
- Frage: "Recherchiere Preise für XYZ und erstelle ein Produkt." -> Intent: DATA_CHANGE, Plan: [web_search, thinking, financial_architect]
- Frage: "Hallo Louis!" -> Intent: GENERAL, Plan: [thinking]
- Frage: "Mache eine SWOT-Analyse basierend auf dem Businessplan-PDF." -> Intent: ANALYSIS, Plan: [local_knowledge, thinking]

### BISHERIGE TOOL-ERGEBNISSE:
${currentResults || "Keine bisherigen Ergebnisse in dieser Sitzung."}

### ANFRAGE: "${prompt}"

ANTWORTE ZWINGEND NUR ALS REINES JSON-OBJEKT:
{
  "intent": "DATA_CHANGE" | "ANALYSIS" | "GENERAL",
  "reasoning": "Strategische Begründung in der Sprache der Anfrage",
  "isComplete": true | false (Setze auf true, wenn alle Informationen für die finale Antwort vorliegen),
  "plan": [
    { 
      "tool": "tool_id", 
      "input": "Suchbegriff oder Arbeitsanweisung", 
      "reason": "Warum dieser Schritt?" 
    }
  ]
}`;

    try {
      const messages: AiMessage[] = [
        { role: 'system' as const, content: 'You are the Louis AI Orchestrator. Plan tool usage professionally and step-by-step. Respond in the same language as the user query.' },
        ...history.map(h => ({ 
          role: h.role === 'model' ? 'assistant' as const : 'user' as const, 
          content: h.rawContent || h.content 
        })),
        { role: 'user' as const, content: strategicPrompt }
      ];

      const responseData = await callAi(this.settings, messages, signal);
      const jsonStr = extractJsonFromString(responseData.content);
      
      if (!jsonStr) throw new Error("No JSON found in Orchestrator response");
      
      const parsed = JSON.parse(jsonStr) as StrategicPlan;
      return {
        plan: {
          intent: parsed.intent || 'GENERAL',
          reasoning: parsed.reasoning || '',
          plan: parsed.plan || [],
          isComplete: parsed.isComplete ?? false
        },
        usage: responseData.usage
      };
    } catch (err: unknown) {
      console.error("Orchestrator failed:", err instanceof Error ? err.message : err);
      return {
        plan: {
          intent: 'GENERAL',
          reasoning: 'Fallback-Plan aufgrund eines Fehlers im Orchestrator.',
          plan: manualToolsList.length > 0 
            ? manualToolsList.map(t => ({ tool: t, input: prompt, reason: 'Manuell erzwungen' })) 
            : [{ tool: "thinking", input: "", reason: 'Default Thinking' }]
        }
      };
    }
  }
}
